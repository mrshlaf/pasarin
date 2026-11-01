/**
 * Rute API Registri Pemanggilan Alat Sub-Agen (PSR-18 / Tool Calling Registry API).
 * Menyediakan endpoint HTTP GET untuk menginventarisasi seluruh alat fungsi sub-agen terdaftar
 * beserta skema parameter, tipe data, dan pemetaan ke modul agen terkait.
 */

import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { PASARIN_TOOL_DECLARATIONS } from "@/lib/toolCallingRegistry";

export const dynamic = "force-dynamic";

/**
 * Mengembalikan daftar seluruh deklarasi alat fungsi sub-agen terdaftar dalam ekosistem PASARIN.
 *
 * @returns Respons JSON berisi array FunctionDeclaration resmi dan jumlah total alat.
 */
export async function GET(): Promise<NextResponse> {
  return successResponse(
    {
      totalTools: PASARIN_TOOL_DECLARATIONS.length,
      tools: PASARIN_TOOL_DECLARATIONS,
    },
    200
  );
}

/**
 * Menangani pemeriksaan ketersediaan ringan (health probe).
 *
 * @returns Respons HTTP kosong dengan status 200 OK.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
