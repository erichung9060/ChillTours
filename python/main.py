import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from math import atan2, cos, radians, sin, sqrt
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
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
    flexible: Optional[bool] = None  # False = fixed time anchor (tickets, shows)
    type: Optional[str] = None  # "lunch" | "dinner" | "breakfast" | None


class OptimizeRequest(BaseModel):
    activities: List[ActivityInput]
    mode: str = "driving"  # walking | driving | transit | bicycling
    start_time: str = "09:00"  # "HH:MM" day start (overrides activities[0].time)
    end_time: str = "20:00"    # "HH:MM" day end


class OptimizeResponse(BaseModel):
    order: List[str]
    travel_times_minutes: List[int]


# For /optimize/full, we now expect the frontend to pass pre-enriched activities
class EnrichedActivityInput(ActivityInput):
    place_id: Optional[str] = None
    rating: Optional[float] = None
    # opening_hours is inherited as the raw TimeWindow or dict, 
    # but the frontend will now pass the parsed TimeWindow directly into ActivityInput.opening_hours.

class FullOptimizeRequest(BaseModel):
    activities: List[EnrichedActivityInput]
    date: str  # "YYYY-MM-DD" of this day
    mode: str = "driving"  # walking | driving | transit | bicycling
    start_time: str = "09:00"  # "HH:MM" day start (overrides activities[0].time)
    end_time: str = "20:00"    # "HH:MM" day end


class FullOptimizeResponse(BaseModel):
    order: List[str]
    travel_times_minutes: List[int]


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

# Fallback speeds when Google Maps API is unavailable
_MODE_SPEED_KMH: Dict[str, float] = {
    "walking":   4.0,
    "bicycling": 15.0,
    "driving":   40.0,   # city average incl. traffic
    "transit":   20.0,   # incl. waiting / transfers
}


def build_haversine_matrix(activities: List[ActivityInput], mode: str = "walking") -> List[List[int]]:
    speed = _MODE_SPEED_KMH.get(mode, 4.0)
    n = len(activities)
    return [
        [
            0 if i == j else haversine_minutes(
                activities[i].lat, activities[i].lng,
                activities[j].lat, activities[j].lng,
                speed_kmh=speed,
            )
            for j in range(n)
        ]
        for i in range(n)
    ]


def build_google_distance_matrix(activities: List[ActivityInput], mode: str = "walking") -> Optional[List[List[int]]]:
    """Single API call: N×N matrix. mode: walking | driving | transit | bicycling."""
    if not GOOGLE_MAPS_API_KEY:
        return None
    locations = "|".join(f"{a.lat},{a.lng}" for a in activities)
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/distancematrix/json",
            params={"origins": locations, "destinations": locations,
                    "mode": mode, "key": GOOGLE_MAPS_API_KEY},
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


def build_distance_matrix(activities: List[ActivityInput], mode: str = "walking") -> Tuple[List[List[int]], str]:
    if GOOGLE_MAPS_API_KEY:
        matrix = build_google_distance_matrix(activities, mode)
        if matrix is not None:
            return matrix, f"Google Maps Distance Matrix API ({mode})"
        logger.warning("Google Maps failed — falling back to Haversine")
    else:
        logger.info("GOOGLE_MAPS_API_KEY not set — using Haversine")
    speed = _MODE_SPEED_KMH.get(mode, 4.0)
    return build_haversine_matrix(activities, mode), f"Haversine fallback ({mode}, {speed} km/h)"


# ============================================================
# OR-Tools: shared helpers
# ============================================================

_MEAL_HARD_WINDOWS: Dict[str, Tuple[str, str]] = {
    "breakfast": ("07:00", "10:00"),
    "lunch":     ("11:00", "14:00"),
    "dinner":    ("17:30", "21:00"),
}


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
        # Meal activities: hard range constraint (must arrive within meal window)
        if activity.type in _MEAL_HARD_WINDOWS:
            open_str, close_str = _MEAL_HARD_WINDOWS[activity.type]
            lo = max(0, parse_time_to_minutes(open_str) - start_time_minutes)
            hi = max(lo, parse_time_to_minutes(close_str) - start_time_minutes)
            time_dim.CumulVar(node_index).SetRange(lo, hi)
            logger.info("  Time window [%s]: MEAL hard range %d-%d min from start (%s-%s)",
                        activity.title, lo, hi, open_str, close_str)
            continue
        if activity.flexible is False:
            planned = parse_time_to_minutes(activity.time) - start_time_minutes
            lo = max(0, planned - 15)
            hi = planned + 15
            time_dim.CumulVar(node_index).SetRange(lo, hi)
            logger.info("  Time window [%s]: FIXED %d-%d min from start (%s ±15)",
                        activity.title, lo, hi, activity.time)
            continue
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


def _build_params(fss, lsm, seconds: int, sol_limit: int = 100) -> pywrapcp.DefaultRoutingSearchParameters:
    p = pywrapcp.DefaultRoutingSearchParameters()
    p.first_solution_strategy = fss
    p.local_search_metaheuristic = lsm
    p.time_limit.seconds = seconds
    p.solution_limit = sol_limit
    p.log_search = False
    return p


# ============================================================
# Time limit configuration (seconds per strategy, parallel)
# ============================================================
# Each strategy runs in parallel; wall time ≈ this value.
# Increase for better solution quality at cost of latency.
SOLVER_TIME_LIMIT_SMALL = int(os.getenv("SOLVER_TIME_LIMIT_SMALL", "1"))  # n ≤ 8
SOLVER_TIME_LIMIT_LARGE = int(os.getenv("SOLVER_TIME_LIMIT_LARGE", "3"))  # n > 8

# Strategy matrix: (name, first_solution, metaheuristic)
# time_sec is injected at runtime from SOLVER_TIME_LIMIT_* above.
_STRATEGY_DEFS_SMALL = [
    ("PATH_CHEAPEST_ARC + GUIDED_LOCAL_SEARCH",
     routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC,
     routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH),
    ("SAVINGS + TABU_SEARCH",
     routing_enums_pb2.FirstSolutionStrategy.SAVINGS,
     routing_enums_pb2.LocalSearchMetaheuristic.TABU_SEARCH),
    ("CHRISTOFIDES + GUIDED_LOCAL_SEARCH",
     routing_enums_pb2.FirstSolutionStrategy.CHRISTOFIDES,
     routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH),
    ("PARALLEL_CHEAPEST_INSERTION + SIMULATED_ANNEALING",
     routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION,
     routing_enums_pb2.LocalSearchMetaheuristic.SIMULATED_ANNEALING),
    ("LOCAL_CHEAPEST_INSERTION + GENERIC_TABU_SEARCH",
     routing_enums_pb2.FirstSolutionStrategy.LOCAL_CHEAPEST_INSERTION,
     routing_enums_pb2.LocalSearchMetaheuristic.GENERIC_TABU_SEARCH),
]

_STRATEGY_DEFS_LARGE = [
    ("PARALLEL_CHEAPEST_INSERTION + GUIDED_LOCAL_SEARCH",
     routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION,
     routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH),
    ("SAVINGS + GUIDED_LOCAL_SEARCH",
     routing_enums_pb2.FirstSolutionStrategy.SAVINGS,
     routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH),
    ("LOCAL_CHEAPEST_INSERTION + TABU_SEARCH",
     routing_enums_pb2.FirstSolutionStrategy.LOCAL_CHEAPEST_INSERTION,
     routing_enums_pb2.LocalSearchMetaheuristic.TABU_SEARCH),
    ("CHRISTOFIDES + SIMULATED_ANNEALING",
     routing_enums_pb2.FirstSolutionStrategy.CHRISTOFIDES,
     routing_enums_pb2.LocalSearchMetaheuristic.SIMULATED_ANNEALING),
]


def _strategies(n: int):
    """Returns list of (name, fss, lsm, time_sec) with current time limits."""
    if n <= 8:
        return [(name, fss, lsm, SOLVER_TIME_LIMIT_SMALL)
                for name, fss, lsm in _STRATEGY_DEFS_SMALL]
    return [(name, fss, lsm, SOLVER_TIME_LIMIT_LARGE)
            for name, fss, lsm in _STRATEGY_DEFS_LARGE]


# ============================================================
# Layer 1: OR-Tools with virtual depot (free start choice)
# ============================================================

def _run_layer1_strategy(
    name: str, fss, lsm, sec: int,
    n: int, transit, matrix: List[List[int]],
    activities: List[ActivityInput], start_time_minutes: int, total_available: int,
) -> Optional[Tuple[int, List[str], List[int]]]:
    """
    Uses RegisterTransitMatrix (pure C++ lookup) → GIL released during SolveWithParameters.
    transit[i][j] = travel(i→j) + service_time(i), nodes 0..n (0 = virtual depot).
    """
    mgr = pywrapcp.RoutingIndexManager(n + 1, 1, 0)
    rt = pywrapcp.RoutingModel(mgr)

    cb = rt.RegisterTransitMatrix(transit)
    rt.SetArcCostEvaluatorOfAllVehicles(cb)

    has_windows = any(a.opening_hours for a in activities)
    if has_windows:
        rt.AddDimension(cb, 180, total_available + 60, False, "Time")
        time_dim = rt.GetDimensionOrDie("Time")
        time_dim.CumulVar(mgr.NodeToIndex(0)).SetRange(0, total_available)
        _apply_time_windows(time_dim, mgr, activities, start_time_minutes, total_available, node_offset=1)

    solution = rt.SolveWithParameters(_build_params(fss, lsm, sec))
    if not solution:
        logger.info("[Layer 1] %s → no solution", name)
        return None

    cost = solution.ObjectiveValue()
    idx = rt.Start(0)
    route_nodes: List[int] = []
    while not rt.IsEnd(idx):
        route_nodes.append(mgr.IndexToNode(idx))
        idx = solution.Value(rt.NextVar(idx))

    real_nodes = [i for i in route_nodes if i > 0]
    ordered_ids = [activities[i - 1].id for i in real_nodes]
    travel_times = [matrix[real_nodes[k] - 1][real_nodes[k + 1] - 1]
                    for k in range(len(real_nodes) - 1)]
    logger.info("[Layer 1] %s → cost=%d", name, cost)
    return cost, ordered_ids, travel_times


def _layer1_virtual_depot(
    activities: List[ActivityInput],
    matrix: List[List[int]],
    start_time_minutes: int,
    end_time_minutes: int = 1200,
) -> Optional[Tuple[List[str], List[int]]]:
    n = len(activities)
    total_available = end_time_minutes - start_time_minutes

    # Build (n+1)×(n+1) numpy transit matrix (int64, C-contiguous).
    # Node 0 = virtual depot (service=0), nodes 1..n = activities.
    # transit[i][j] = travel(i→j) + service_at(i)
    service = np.array([0] + [a.duration_minutes for a in activities], dtype=np.int64)
    mat = np.array(matrix, dtype=np.int64)
    arr = np.zeros((n + 1, n + 1), dtype=np.int64)
    arr[1:, 1:] = mat + service[1:, np.newaxis]
    arr[1:, 0] = service[1:]
    np.fill_diagonal(arr, 0)
    transit = [tuple(row.tolist()) for row in arr]  # OR-Tools requires list of tuples

    strategies = _strategies(n)
    logger.info("[Layer 1] running %d strategies in parallel (RegisterTransitMatrix)", len(strategies))

    best_cost: Optional[int] = None
    best_result: Optional[Tuple[List[str], List[int]]] = None

    with ThreadPoolExecutor(max_workers=len(strategies)) as pool:
        futures = {
            pool.submit(_run_layer1_strategy,
                        name, fss, lsm, sec,
                        n, transit, matrix, activities,
                        start_time_minutes, total_available): name  # type: ignore[arg-type]
            for name, fss, lsm, sec in strategies
        }
        for future in as_completed(futures):
            result = future.result()
            if result is None:
                continue
            cost, ordered_ids, travel_times = result
            if best_cost is None or cost < best_cost:
                best_cost = cost
                best_result = (ordered_ids, travel_times)
                logger.info("[Layer 1] ★ new best cost=%d via %s", cost, futures[future])

    return best_result


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


def _run_layer2_strategy(
    name: str, fss, lsm, sec: int,
    n: int, smart_start: int, transit, matrix: List[List[int]],
    activities: List[ActivityInput], start_time_minutes: int, total_available: int,
) -> Optional[Tuple[int, List[str], List[int]]]:
    """
    Uses RegisterTransitMatrix (pure C++) → GIL released during SolveWithParameters.
    transit[i][j] = travel(i→j) + service_at(i).
    """
    mgr = pywrapcp.RoutingIndexManager(n, 1, smart_start)
    rt = pywrapcp.RoutingModel(mgr)

    cb = rt.RegisterTransitMatrix(transit)
    rt.SetArcCostEvaluatorOfAllVehicles(cb)

    has_windows = any(a.opening_hours for a in activities)
    if has_windows:
        rt.AddDimension(cb, 180, total_available + 60, False, "Time")
        time_dim = rt.GetDimensionOrDie("Time")
        _apply_time_windows(time_dim, mgr, activities, start_time_minutes, total_available, node_offset=0)

    solution = rt.SolveWithParameters(_build_params(fss, lsm, sec))
    if not solution:
        logger.info("[Layer 2] %s → no solution", name)
        return None

    cost = solution.ObjectiveValue()
    idx = rt.Start(0)
    route_nodes: List[int] = []
    while not rt.IsEnd(idx):
        route_nodes.append(mgr.IndexToNode(idx))
        idx = solution.Value(rt.NextVar(idx))

    ordered_ids = [activities[i].id for i in route_nodes]
    travel_times = [matrix[route_nodes[k]][route_nodes[k + 1]]
                    for k in range(len(route_nodes) - 1)]
    logger.info("[Layer 2] %s → cost=%d", name, cost)
    return cost, ordered_ids, travel_times


def _layer2_smart_start(
    activities: List[ActivityInput],
    matrix: List[List[int]],
    start_time_minutes: int,
    end_time_minutes: int = 1200,
) -> Optional[Tuple[List[str], List[int]]]:
    n = len(activities)
    total_available = end_time_minutes - start_time_minutes
    smart_start = _pick_smart_start(activities)

    logger.info("[Layer 2] fixed start = '%s' (index %d)",
                activities[smart_start].title, smart_start)

    # Build n×n numpy transit matrix (int64, C-contiguous).
    # transit[i][j] = travel(i→j) + service_at(i)
    service = np.array([a.duration_minutes for a in activities], dtype=np.int64)
    mat = np.array(matrix, dtype=np.int64)
    arr = mat + service[:, np.newaxis]
    np.fill_diagonal(arr, 0)
    transit = [tuple(row.tolist()) for row in arr]  # OR-Tools requires list of tuples

    strategies = _strategies(n)
    logger.info("[Layer 2] running %d strategies in parallel (RegisterTransitMatrix)", len(strategies))

    best_cost: Optional[int] = None
    best_result: Optional[Tuple[List[str], List[int]]] = None

    with ThreadPoolExecutor(max_workers=len(strategies)) as pool:
        futures = {
            pool.submit(_run_layer2_strategy,
                        name, fss, lsm, sec,
                        n, smart_start, transit, matrix, activities,
                        start_time_minutes, total_available): name  # type: ignore[arg-type]
            for name, fss, lsm, sec in strategies
        }
        for future in as_completed(futures):
            result = future.result()
            if result is None:
                continue
            cost, ordered_ids, travel_times = result
            if best_cost is None or cost < best_cost:
                best_cost = cost
                best_result = (ordered_ids, travel_times)
                logger.info("[Layer 2] ★ new best cost=%d via %s", cost, futures[future])

    return best_result


# ============================================================
# Layer 3: Greedy nearest neighbor (guaranteed fallback)
# ============================================================

def _layer3_greedy(
    activities: List[ActivityInput],
    matrix: List[List[int]],
    start_time_minutes: int = 540,
) -> Tuple[List[str], List[int]]:
    """
    Time-window-aware greedy:
    - If activities have opening_hours, start from earliest-opening one.
    - At each step, prefer activities reachable within their time window;
      fall back to nearest if none are reachable.
    """
    n = len(activities)
    has_windows = any(a.opening_hours for a in activities)

    # Pick starting point: earliest-opening if time windows exist
    if has_windows:
        start = min(
            range(n),
            key=lambda i: parse_time_to_minutes(activities[i].opening_hours.open)
            if activities[i].opening_hours else 9999
        )
    else:
        start = 0

    unvisited = set(range(n))
    current = start
    unvisited.remove(start)
    route = [start]
    current_time = start_time_minutes  # cumulative time tracker

    while unvisited:
        if has_windows:
            # Prefer activities whose window we can still reach
            def score(j):
                travel = matrix[current][j]
                arrive = current_time + activities[current].duration_minutes + travel
                if activities[j].opening_hours:
                    open_min = parse_time_to_minutes(activities[j].opening_hours.open)
                    close_min = parse_time_to_minutes(activities[j].opening_hours.close)
                    if arrive > close_min:
                        return (2, travel)   # missed window
                    wait = max(0, open_min - arrive)
                    return (0, wait + travel)  # prefer less wait + travel
                return (1, travel)  # no window, secondary priority

            next_node = min(unvisited, key=score)
            travel = matrix[current][next_node]
            current_time += activities[current].duration_minutes + travel
            if activities[next_node].opening_hours:
                open_min = parse_time_to_minutes(activities[next_node].opening_hours.open)
                current_time = max(current_time, open_min)
        else:
            next_node = min(unvisited, key=lambda j: matrix[current][j])

        route.append(next_node)
        unvisited.remove(next_node)
        current = next_node

    ordered_ids = [activities[i].id for i in route]
    travel_times = [matrix[route[k]][route[k + 1]] for k in range(len(route) - 1)]
    return ordered_ids, travel_times


# ============================================================
# Main optimization orchestrator
# ============================================================

def _is_likely_infeasible(
    activities: List[ActivityInput],
    matrix: List[List[int]],
    start_time_minutes: int,
    end_time_minutes: int = 1200,
) -> bool:
    """
    Quick pre-check: if total service time + minimum spanning travel time
    exceeds total available time, OR-Tools will almost certainly fail.
    Skips the expensive Layer 1/2 attempts and goes straight to Layer 3.
    """
    total_service = sum(a.duration_minutes for a in activities)
    total_available = end_time_minutes - start_time_minutes

    # Minimum travel: sum of cheapest outgoing edge per node (lower bound)
    n = len(activities)
    min_travel = sum(
        min(matrix[i][j] for j in range(n) if j != i)
        for i in range(n)
    )
    if total_service + min_travel > total_available + 60:  # +60 = same slack as AddDimension
        logger.warning(
            "Pre-check: likely infeasible — service=%dmin + min_travel=%dmin > available=%dmin → skip to Layer 3",
            total_service, min_travel, total_available
        )
        return True
    return False


def optimize_route(activities: List[ActivityInput], mode: str = "walking", start_time: str = "09:00", end_time: str = "20:00") -> Tuple[List[str], List[int]]:
    n = len(activities)
    if n <= 1:
        return [a.id for a in activities], []

    start_time_minutes = parse_time_to_minutes(start_time)
    end_time_minutes = parse_time_to_minutes(end_time)
    matrix, matrix_method = build_distance_matrix(activities, mode)
    logger.info("Distance matrix: %s", matrix_method)

    # === OR-Tools 完整輸入 ===
    logger.info("=== OR-Tools Input ===")
    logger.info("  n=%d, mode=%s, start=%s (%dmin), end=%s (%dmin), available=%dmin",
                n, mode, start_time, start_time_minutes, end_time, end_time_minutes,
                end_time_minutes - start_time_minutes)
    for i, a in enumerate(activities):
        tw = a.opening_hours
        tw_str = f"  time_window=[{tw.open},{tw.close}]" if tw else "  no_time_window"
        logger.info("  [%d] %s | duration=%dmin%s", i, a.title, a.duration_minutes, tw_str)
    logger.info("  Distance matrix (minutes):")
    for row in matrix:
        logger.info("    %s", [round(v) for v in row])
    logger.info("=== OR-Tools Input END ===")

    # Skip Layer 1/2 if schedule is physically impossible
    has_windows = any(a.opening_hours for a in activities)
    if has_windows and _is_likely_infeasible(activities, matrix, start_time_minutes, end_time_minutes):
        logger.warning("Skipping OR-Tools layers → Layer 3 directly")
        return _layer3_greedy(activities, matrix, start_time_minutes)

    logger.info("--- Layer 1: OR-Tools + virtual depot ---")
    result = _layer1_virtual_depot(activities, matrix, start_time_minutes, end_time_minutes)
    if result:
        return result

    logger.warning("Layer 1 failed → Layer 2: OR-Tools + smart fixed start")
    result = _layer2_smart_start(activities, matrix, start_time_minutes, end_time_minutes)
    if result:
        return result

    logger.warning("Layer 2 failed → Layer 3: greedy nearest neighbor (guaranteed)")
    return _layer3_greedy(activities, matrix, start_time_minutes)




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

    ordered_ids, travel_times = optimize_route(activities, body.mode, body.start_time, body.end_time)

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
        return FullOptimizeResponse(
            order=[a.id for a in activities],
            travel_times_minutes=[],
        )

    # Step 1: Frontend now passes pre-enriched activities with Place data.
    # We still need to parse the TimeWindow based on the specific day-of-week 
    # if the opening_hours field contains raw Google Places JSON (currently frontend parses it, but just in case)
    enriched_inputs: List[ActivityInput] = []
    for a in activities:
        logger.info("  Processing '%s' (lat=%.5f, lng=%.5f)", a.title, a.lat, a.lng)
        # Assuming frontend passes TimeWindow directly now. If not, fallback logic.
        enriched_inputs.append(ActivityInput(
            id=a.id,
            title=a.title,
            lat=a.lat,
            lng=a.lng,
            duration_minutes=a.duration_minutes,
            time=a.time,
            opening_hours=a.opening_hours,
            flexible=a.flexible,
            type=a.type,
        ))

    # Step 2: Run OR-Tools
    logger.info("--- Running OR-Tools with time windows (mode=%s) ---", body.mode)
    ordered_ids, travel_times = optimize_route(enriched_inputs, body.mode, body.start_time, body.end_time)

    id_to_title = {a.id: a.title for a in activities}
    logger.info("Output order (%d activities):", len(ordered_ids))
    for i, aid in enumerate(ordered_ids):
        travel = f" → travel {travel_times[i]}min" if i < len(travel_times) else ""
        logger.info("  [%d] %s%s", i, id_to_title.get(aid, aid), travel)

    return FullOptimizeResponse(
        order=ordered_ids,
        travel_times_minutes=travel_times,
    )
