/**
 * Rute API Pemantauan Kesehatan Layanan dan Basis Data (PSR-3).
 * Menyediakan endpoint HTTP GET untuk diagnostik kesehatan proses Node.js,
 * penggunaan memori RAM (RSS), status konfigurasi basis data Supabase, serta HEAD probe ringan.
 */

import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { HealthCheckData } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * Menangani permintaan diagnostik kesehatan sistem PASARIN via HTTP GET.
 * Memeriksa runtime Node.js, kalkulasi konsumsi memori resident set size (RSS),
 * dan status ketersediaan endpoint Supabase.
 *
 * @returns Respons JSON HealthCheckData dengan status HTTP 200 OK.
 */
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

/**
 * Menangani pemeriksaan ketersediaan ringan (health probe) tanpa alokasi payload respons.
 * Digunakan oleh load balancer dan uptime robot pemantau sistem.
 *
 * @returns Respons HTTP kosong dengan kode status 200 OK.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
