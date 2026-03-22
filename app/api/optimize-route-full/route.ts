import { NextRequest, NextResponse } from "next/server";
import { optimizeRouteFull } from "@/lib/route-optimization/orchestrator";
import type { OptimizeRequest } from "@/lib/route-optimization/types";

export async function POST(request: NextRequest) {
  const body: OptimizeRequest & { date: string } = await request.json();

  try {
    const result = await optimizeRouteFull(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[optimize-route-full] error:", err);
    return NextResponse.json({ error: "Full route optimization failed" }, { status: 500 });
  }
}
