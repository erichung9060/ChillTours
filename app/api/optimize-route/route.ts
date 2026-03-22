import { NextRequest, NextResponse } from "next/server";
import { optimizeRoute } from "@/lib/route-optimization/orchestrator";
import type { OptimizeRequest } from "@/lib/route-optimization/types";

export async function POST(request: NextRequest) {
  const body: OptimizeRequest = await request.json();

  try {
    const result = await optimizeRoute(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[optimize-route] error:", err);
    return NextResponse.json({ error: "Route optimization failed" }, { status: 500 });
  }
}
