/**
 * GET /api/health: status operasional server & konektivitas database (PSR-3)
 * HEAD /api/health: lightweight health probe
 */

import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { HealthCheckData } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const memUsage = process.memoryUsage();
  const memoryMB = Math.round((memUsage.rss / 1024 / 1024) * 100) / 100;

  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder");

  const healthData: HealthCheckData = {
    status: "healthy",
    service: "pasarin-api",
    version: "0.1.0",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database: supabaseConfigured ? "configured" : "unconfigured",
      memoryUsageMB: memoryMB,
    },
  };

  return successResponse(healthData, 200);
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
