import logging
import os
from datetime import date, timedelta
from math import atan2, cos, radians, sin, sqrt
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from pydantic import BaseModel

# Load .env.local from project root (one level up from python/)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env.local")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Lazy supabase client — only used by /optimize/full
_supabase_client = None

def get_supabase():
    global _supabase_client
    if _supabase_client is None and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Request / Response Models
# ============================================================

class TimeWindow(BaseModel):
    """Business hours for the day. Enables time-window constraints in OR-Tools."""
    open: str   # "HH:MM"
    close: str  # "HH:MM"


class ActivityInput(BaseModel):
    id: str
    title: str
    lat: float
    lng: float
    duration_minutes: int
    time: str  # "HH:MM" planned start time
    opening_hours: Optional[TimeWindow] = None


class OptimizeRequest(BaseModel):
    activities: List[ActivityInput]


class OptimizeResponse(BaseModel):
    order: List[str]
    travel_times_minutes: List[int]


class EnrichedActivity(BaseModel):
    id: str
    place_id: Optional[str] = None
    lat: float
    lng: float
    rating: Optional[float] = None
    opening_hours: Optional[dict] = None  # raw Google opening_hours JSONB


class FullOptimizeRequest(BaseModel):
    activities: List[ActivityInput]
    date: str  # "YYYY-MM-DD" of this day


class FullOptimizeResponse(BaseModel):
    order: List[str]
    travel_times_minutes: List[int]
    enriched_activities: List[EnrichedActivity]


# ============================================================
# Utilities
# ============================================================

def parse_time_to_minutes(time_str: str) -> int:
    h, m = map(int, time_str.split(":"))
    return h * 60 + m


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    lat1_r, lon1_r, lat2_r, lon2_r = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2_r - lat1_r, lon2_r - lon1_r
    a = sin(dlat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def haversine_minutes(lat1: float, lon1: float, lat2: float, lon2: float,
                      speed_kmh: float = 4.0) -> int:
    return max(1, int(haversine_km(lat1, lon1, lat2, lon2) / speed_kmh * 60))


# ============================================================
# Distance Matrix  (Google Maps Distance Matrix API → Haversine)
# ============================================================

def build_haversine_matrix(activities: List[ActivityInput]) -> List[List[int]]:
    n = len(activities)
    return [
        [
            0 if i == j else haversine_minutes(
                activities[i].lat, activities[i].lng,
                activities[j].lat, activities[j].lng,
            )
            for j in range(n)
        ]
        for i in range(n)
    ]


def build_google_distance_matrix(activities: List[ActivityInput]) -> Optional[List[List[int]]]:
    """Single API call: N×N matrix (walking mode). Returns None on failure."""
    if not GOOGLE_MAPS_API_KEY:
        return None
    locations = "|".join(f"{a.lat},{a.lng}" for a in activities)
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/distancematrix/json",
            params={"origins": locations, "destinations": locations,
                    "mode": "walking", "key": GOOGLE_MAPS_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "OK":
            logger.warning("Google Distance Matrix status: %s", data.get("status"))
            return None
        matrix: List[List[int]] = []
        for i, row in enumerate(data["rows"]):
            matrix_row: List[int] = []
            for j, element in enumerate(row["elements"]):
                if element["status"] == "OK":
                    matrix_row.append(max(1, int(element["duration"]["value"] / 60)))
                else:
                    matrix_row.append(haversine_minutes(
                        activities[i].lat, activities[i].lng,
                        activities[j].lat, activities[j].lng,
                    ))
            matrix.append(matrix_row)
        return matrix
    except Exception as exc:
        logger.warning("Google Distance Matrix exception: %s", exc)
        return None


def build_distance_matrix(activities: List[ActivityInput]) -> Tuple[List[List[int]], str]:
    if GOOGLE_MAPS_API_KEY:
        matrix = build_google_distance_matrix(activities)
        if matrix is not None:
            return matrix, "Google Maps Distance Matrix API (walking)"
        logger.warning("Google Maps failed — falling back to Haversine")
    else:
        logger.info("GOOGLE_MAPS_API_KEY not set — using Haversine")
    return build_haversine_matrix(activities), "Haversine formula (4 km/h walking)"


# ============================================================
# OR-Tools: shared helpers
# ============================================================

def _apply_time_windows(
    time_dim: pywrapcp.RoutingDimension,
    manager: pywrapcp.RoutingIndexManager,
    activities: List[ActivityInput],
    start_time_minutes: int,
    total_available: int,
    node_offset: int = 0,
) -> None:
    for i, activity in enumerate(activities):
        node_index = manager.NodeToIndex(i + node_offset)
        if activity.opening_hours:
            open_min = parse_time_to_minutes(activity.opening_hours.open) - start_time_minutes
            close_min = parse_time_to_minutes(activity.opening_hours.close) - start_time_minutes
            lo = max(0, open_min - 30)
            hi = max(lo, close_min)
            time_dim.CumulVar(node_index).SetRange(lo, hi)
            logger.info("  Time window [%s]: arrive %d-%d min from start (%s-%s)",
                        activity.title, lo, hi,
                        activity.opening_hours.open, activity.opening_hours.close)
        else:
            time_dim.CumulVar(node_index).SetRange(0, total_available)


def _search_params(n: int) -> Tuple[pywrapcp.DefaultRoutingSearchParameters, str]:
    params = pywrapcp.DefaultRoutingSearchParameters()
    if n <= 5:
        params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GREEDY_DESCENT
        params.time_limit.seconds = 5
        name = "PATH_CHEAPEST_ARC + GREEDY_DESCENT (n≤5, 5s)"
    else:
        params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
        params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        params.time_limit.seconds = 10
        name = "PARALLEL_CHEAPEST_INSERTION + GUIDED_LOCAL_SEARCH (n>5, 10s)"
    params.solution_limit = 20
    params.log_search = False
    return params, name


# ============================================================
# Layer 1: OR-Tools with virtual depot (free start choice)
# ============================================================

def _layer1_virtual_depot(
    activities: List[ActivityInput],
    matrix: List[List[int]],
    start_time_minutes: int,
) -> Optional[Tuple[List[str], List[int]]]:
    n = len(activities)
    total_available = 1080 - start_time_minutes

    ext = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n):
        for j in range(n):
            ext[i + 1][j + 1] = matrix[i][j]

    manager = pywrapcp.RoutingIndexManager(n + 1, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def time_cb(fi, ti):
        fn, tn = manager.IndexToNode(fi), manager.IndexToNode(ti)
        service = activities[fn - 1].duration_minutes if fn > 0 else 0
        return ext[fn][tn] + service

    cb = routing.RegisterTransitCallback(time_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(cb)
    routing.AddDimension(cb, 180, total_available + 60, False, "Time")
    time_dim = routing.GetDimensionOrDie("Time")
    time_dim.CumulVar(manager.NodeToIndex(0)).SetRange(0, total_available)
    _apply_time_windows(time_dim, manager, activities, start_time_minutes, total_available,
                        node_offset=1)

    params, strategy = _search_params(n)
    logger.info("[Layer 1] strategy: %s", strategy)
    solution = routing.SolveWithParameters(params)
    if not solution:
        return None

    logger.info("[Layer 1] OR-Tools found a solution.")
    idx = routing.Start(0)
    route_nodes: List[int] = []
    while not routing.IsEnd(idx):
        route_nodes.append(manager.IndexToNode(idx))
        idx = solution.Value(routing.NextVar(idx))

    real_nodes = [i for i in route_nodes if i > 0]
    ordered_ids = [activities[i - 1].id for i in real_nodes]
    travel_times = [matrix[real_nodes[k] - 1][real_nodes[k + 1] - 1]
                    for k in range(len(real_nodes) - 1)]
    return ordered_ids, travel_times


# ============================================================
# Layer 2: OR-Tools with smart fixed start
# ============================================================

def _pick_smart_start(activities: List[ActivityInput]) -> int:
    candidates = [
        (parse_time_to_minutes(a.opening_hours.open), i)
        for i, a in enumerate(activities)
        if a.opening_hours
    ]
    return min(candidates)[1] if candidates else 0


def _layer2_smart_start(
    activities: List[ActivityInput],
    matrix: List[List[int]],
    start_time_minutes: int,
) -> Optional[Tuple[List[str], List[int]]]:
    n = len(activities)
    total_available = 1080 - start_time_minutes
    smart_start = _pick_smart_start(activities)

    logger.info("[Layer 2] fixed start = '%s' (index %d)",
                activities[smart_start].title, smart_start)

    manager = pywrapcp.RoutingIndexManager(n, 1, smart_start)
    routing = pywrapcp.RoutingModel(manager)

    def time_cb(fi, ti):
        fn, tn = manager.IndexToNode(fi), manager.IndexToNode(ti)
        return matrix[fn][tn] + activities[fn].duration_minutes

    cb = routing.RegisterTransitCallback(time_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(cb)
    routing.AddDimension(cb, 180, total_available + 60, False, "Time")
    time_dim = routing.GetDimensionOrDie("Time")
    _apply_time_windows(time_dim, manager, activities, start_time_minutes, total_available,
                        node_offset=0)

    params, strategy = _search_params(n)
    logger.info("[Layer 2] strategy: %s", strategy)
    solution = routing.SolveWithParameters(params)
    if not solution:
        return None

    logger.info("[Layer 2] OR-Tools found a solution.")
    idx = routing.Start(0)
    route_nodes: List[int] = []
    while not routing.IsEnd(idx):
        route_nodes.append(manager.IndexToNode(idx))
        idx = solution.Value(routing.NextVar(idx))

    ordered_ids = [activities[i].id for i in route_nodes]
    travel_times = [matrix[route_nodes[k]][route_nodes[k + 1]]
                    for k in range(len(route_nodes) - 1)]
    return ordered_ids, travel_times


# ============================================================
# Layer 3: Greedy nearest neighbor (guaranteed fallback)
# ============================================================

def _layer3_greedy(
    activities: List[ActivityInput],
    matrix: List[List[int]],
) -> Tuple[List[str], List[int]]:
    n = len(activities)
    unvisited = set(range(n))
    current = 0
    unvisited.remove(0)
    route = [0]
    while unvisited:
        nearest = min(unvisited, key=lambda j: matrix[current][j])
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    ordered_ids = [activities[i].id for i in route]
    travel_times = [matrix[route[k]][route[k + 1]] for k in range(len(route) - 1)]
    return ordered_ids, travel_times


# ============================================================
# Main optimization orchestrator
# ============================================================

def optimize_route(activities: List[ActivityInput]) -> Tuple[List[str], List[int]]:
    n = len(activities)
    if n <= 1:
        return [a.id for a in activities], []

    start_time_minutes = parse_time_to_minutes(activities[0].time)
    matrix, matrix_method = build_distance_matrix(activities)
    logger.info("Distance matrix: %s", matrix_method)

    logger.info("--- Layer 1: OR-Tools + virtual depot ---")
    result = _layer1_virtual_depot(activities, matrix, start_time_minutes)
    if result:
        return result

    logger.warning("Layer 1 failed → Layer 2: OR-Tools + smart fixed start")
    result = _layer2_smart_start(activities, matrix, start_time_minutes)
    if result:
        return result

    logger.warning("Layer 2 failed → Layer 3: greedy nearest neighbor (guaranteed)")
    return _layer3_greedy(activities, matrix)


# ============================================================
# Place Cache (Supabase)
# ============================================================

def check_place_cache(place_id: str) -> Optional[dict]:
    sb = get_supabase()
    if not sb:
        return None
    try:
        result = sb.table("place_cache").select("*").eq("place_id", place_id).single().execute()
        return result.data
    except Exception:
        return None


def save_place_cache(data: dict) -> None:
    sb = get_supabase()
    if not sb:
        return
    try:
        sb.table("place_cache").upsert(data, on_conflict="place_id").execute()
        logger.info("  [cache] saved place_id=%s", data.get("place_id"))
    except Exception as exc:
        logger.warning("  [cache] save failed: %s", exc)


# ============================================================
# Google Maps Places helpers
# ============================================================

_FIND_PLACE_FIELDS = (
    "place_id,name,geometry,rating,user_ratings_total,"
    "photos,types,business_status,formatted_address"
)

_DETAILS_FIELDS = (
    "name,geometry,formatted_address,rating,user_ratings_total,"
    "formatted_phone_number,international_phone_number,"
    "website,opening_hours,reviews,photos,price_level,"
    "business_status,types"
)


def find_place(title: str, lat: float, lng: float) -> Optional[dict]:
    """Find Place API — returns Basic fields including place_id and geometry."""
    if not GOOGLE_MAPS_API_KEY:
        return None
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
            params={
                "input": title,
                "inputtype": "textquery",
                "locationbias": f"point:{lat},{lng}",
                "fields": _FIND_PLACE_FIELDS,
                "language": "zh-TW",
                "key": GOOGLE_MAPS_API_KEY,
            },
            timeout=10,
        )
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            logger.info("  [find_place] no candidates for '%s'", title)
            return None
        c = candidates[0]
        # Skip non-establishment results (e.g. generic areas)
        types = c.get("types", [])
        if not any(t in types for t in ("establishment", "point_of_interest", "tourist_attraction")):
            logger.info("  [find_place] skipped non-POI result for '%s' (types=%s)", title, types)
            return None
        return c
    except Exception as exc:
        logger.warning("  [find_place] exception: %s", exc)
        return None


def get_place_details(place_id: str) -> Optional[dict]:
    """Place Details API — all fields ($0.05/call). Returns None on failure."""
    if not GOOGLE_MAPS_API_KEY:
        return None
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": place_id,
                "fields": _DETAILS_FIELDS,
                "language": "zh-TW",
                "key": GOOGLE_MAPS_API_KEY,
            },
            timeout=10,
        )
        data = resp.json()
        if data.get("status") != "OK":
            logger.warning("  [place_details] status=%s for %s", data.get("status"), place_id)
            return None
        return data.get("result")
    except Exception as exc:
        logger.warning("  [place_details] exception: %s", exc)
        return None


def enrich_activity(activity: ActivityInput) -> EnrichedActivity:
    """
    Enrich a single activity with Place data.
    Flow: check cache → Find Place → Place Details → save cache
    Falls back to original lat/lng if any step fails.
    """
    base = EnrichedActivity(id=activity.id, lat=activity.lat, lng=activity.lng)

    # Step 1: Find Place → get place_id
    logger.info("  Enriching '%s'...", activity.title)
    found = find_place(activity.title, activity.lat, activity.lng)
    if not found:
        logger.info("  [enrich] no Place found — keeping original coords")
        return base

    place_id = found.get("place_id")
    if not place_id:
        return base

    # Step 2: Check cache
    cached = check_place_cache(place_id)
    if cached:
        logger.info("  [enrich] cache HIT for place_id=%s", place_id)
        geo = cached
        return EnrichedActivity(
            id=activity.id,
            place_id=place_id,
            lat=cached.get("lat", activity.lat),
            lng=cached.get("lng", activity.lng),
            rating=cached.get("rating"),
            opening_hours=cached.get("opening_hours"),
        )

    # Step 3: Place Details (cache miss)
    logger.info("  [enrich] cache MISS — fetching Place Details for %s", place_id)
    details = get_place_details(place_id)
    if not details:
        # Use Find Place geometry at minimum
        geo = found.get("geometry", {}).get("location", {})
        return EnrichedActivity(
            id=activity.id,
            place_id=place_id,
            lat=geo.get("lat", activity.lat),
            lng=geo.get("lng", activity.lng),
            rating=found.get("rating"),
        )

    geo = details.get("geometry", {}).get("location", {})
    lat = geo.get("lat", activity.lat)
    lng = geo.get("lng", activity.lng)
    opening_hours = details.get("opening_hours")
    photos = details.get("photos") or []
    photo_ref = photos[0].get("photo_reference") if photos else None

    # Step 4: Save to cache
    cache_row = {
        "place_id": place_id,
        "name": details.get("name", activity.title),
        "lat": lat,
        "lng": lng,
        "formatted_address": details.get("formatted_address"),
        "rating": details.get("rating"),
        "user_ratings_total": details.get("user_ratings_total"),
        "phone": details.get("formatted_phone_number") or details.get("international_phone_number"),
        "website": details.get("website"),
        "opening_hours": opening_hours,
        "photo_reference": photo_ref,
        "business_status": details.get("business_status"),
        "types": details.get("types"),
    }
    save_place_cache(cache_row)

    return EnrichedActivity(
        id=activity.id,
        place_id=place_id,
        lat=lat,
        lng=lng,
        rating=details.get("rating"),
        opening_hours=opening_hours,
    )


# ============================================================
# Opening hours → TimeWindow for a specific day-of-week
# ============================================================

def get_day_of_week(day_date: str) -> int:
    """Returns Google day-of-week: 0=Sunday, 1=Monday … 6=Saturday."""
    d = date.fromisoformat(day_date)
    return d.isoweekday() % 7  # isoweekday: Mon=1..Sun=7 → Sun=0..Sat=6


def extract_time_window(opening_hours: dict, dow: int) -> Optional[dict]:
    """Extract open/close times for the given day-of-week from Google opening_hours."""
    for period in opening_hours.get("periods", []):
        if period.get("open", {}).get("day") == dow:
            o = period["open"]["time"]   # "1000"
            c = period.get("close", {}).get("time", "2359")
            return {"open": f"{o[:2]}:{o[2:]}", "close": f"{c[:2]}:{c[2:]}"}
    return None


# ============================================================
# Endpoints
# ============================================================

@app.post("/optimize", response_model=OptimizeResponse)
def optimize_endpoint(body: OptimizeRequest) -> OptimizeResponse:
    activities = body.activities

    logger.info("=== /optimize (快速) request ===")
    logger.info("Input activities (%d):", len(activities))
    for i, a in enumerate(activities):
        logger.info("  [%d] %s | lat=%.5f lng=%.5f | duration=%dmin | time=%s",
                    i, a.title, a.lat, a.lng, a.duration_minutes, a.time)

    if len(activities) <= 1:
        logger.info("Only 1 activity — returning as-is.")
        return OptimizeResponse(order=[a.id for a in activities], travel_times_minutes=[])

    ordered_ids, travel_times = optimize_route(activities)

    id_to_title = {a.id: a.title for a in activities}
    logger.info("Output order (%d activities):", len(ordered_ids))
    for i, aid in enumerate(ordered_ids):
        travel = f" → travel {travel_times[i]}min" if i < len(travel_times) else ""
        logger.info("  [%d] %s%s", i, id_to_title.get(aid, aid), travel)

    return OptimizeResponse(order=ordered_ids, travel_times_minutes=travel_times)


@app.post("/optimize/full", response_model=FullOptimizeResponse)
def optimize_full_endpoint(body: FullOptimizeRequest) -> FullOptimizeResponse:
    activities = body.activities
    day_date = body.date
    dow = get_day_of_week(day_date)
    dow_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    logger.info("=== /optimize/full (完整) request ===")
    logger.info("Date: %s (%s), day-of-week=%d", day_date, dow_names[dow], dow)
    logger.info("Input activities (%d):", len(activities))
    for i, a in enumerate(activities):
        logger.info("  [%d] %s | lat=%.5f lng=%.5f | duration=%dmin | time=%s",
                    i, a.title, a.lat, a.lng, a.duration_minutes, a.time)

    if len(activities) <= 1:
        enriched = [enrich_activity(a) for a in activities]
        return FullOptimizeResponse(
            order=[a.id for a in activities],
            travel_times_minutes=[],
            enriched_activities=enriched,
        )

    # Step 1: Enrich each activity with Place data
    logger.info("--- Enriching activities ---")
    enriched_list: List[EnrichedActivity] = [enrich_activity(a) for a in activities]

    # Step 2: Build enriched ActivityInput list with precise coords + time windows
    enriched_inputs: List[ActivityInput] = []
    for orig, enriched in zip(activities, enriched_list):
        tw = None
        if enriched.opening_hours:
            tw_dict = extract_time_window(enriched.opening_hours, dow)
            if tw_dict:
                tw = TimeWindow(open=tw_dict["open"], close=tw_dict["close"])
                logger.info("  TimeWindow for '%s': %s-%s", orig.title, tw.open, tw.close)
        enriched_inputs.append(ActivityInput(
            id=orig.id,
            title=orig.title,
            lat=enriched.lat,
            lng=enriched.lng,
            duration_minutes=orig.duration_minutes,
            time=orig.time,
            opening_hours=tw,
        ))

    # Step 3: Run OR-Tools with enriched data
    logger.info("--- Running OR-Tools with time windows ---")
    ordered_ids, travel_times = optimize_route(enriched_inputs)

    id_to_title = {a.id: a.title for a in activities}
    logger.info("Output order (%d activities):", len(ordered_ids))
    for i, aid in enumerate(ordered_ids):
        travel = f" → travel {travel_times[i]}min" if i < len(travel_times) else ""
        logger.info("  [%d] %s%s", i, id_to_title.get(aid, aid), travel)

    return FullOptimizeResponse(
        order=ordered_ids,
        travel_times_minutes=travel_times,
        enriched_activities=enriched_list,
    )
