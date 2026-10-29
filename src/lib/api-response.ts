/**
 * Modul Pembungkus Respons API Terstandarisasi dan Validator Skema (PSR-3).
 * Menyediakan amplop respons seragam (envelope) untuk status sukses dan galat,
 * serta pembantu validasi muatan JSON berbasis Zod schema untuk Next.js App Router.
 */

import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { ApiResponse } from "@/types/api";

/**
 * Membungkus data muatan sukses ke dalam amplop standar ApiResponse<T>.
 *
 * @param data - Payload data yang akan dikembalikan ke klien.
 * @param status - Kode status HTTP (default: 200 OK).
 * @returns NextResponse terformat JSON dengan stempel waktu ISO 8601.
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(payload, { status });
}

/**
 * Membungkus pesan kesalahan ke dalam amplop standar ApiResponse<null>.
 *
 * @param error - Pesan kesalahan utama dalam Bahasa Indonesia teknis.
 * @param status - Kode status HTTP kegagalan (default: 400 Bad Request).
 * @param details - Informasi tambahan mengenai galat, seperti rincian kegagalan validasi Zod.
 * @returns NextResponse terformat JSON pembawa pesan kesalahan dan stempel waktu ISO.
 */
export function errorResponse(
  error: string,
  status = 400,
  details?: unknown
): NextResponse<ApiResponse<null>> {
  const payload: ApiResponse<null> = {
    success: false,
    error,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(payload, { status });
}

/**
 * Tipe diskriminasi gabungan untuk hasil validasi muatan JSON.
 * Memisahkan kondisi valid (berisi data T) dan tidak valid (berisi errorResponse siap kirim).
 */
export type ValidationResult<T> =
  | { success: true; data: T; errorResponse: null }
  | { success: false; data: null; errorResponse: NextResponse<ApiResponse<null>> };

/**
 * Mem-parsing dan memvalidasi muatan body JSON permintaan terhadap skema Zod yang ditentukan.
 * Mencegah uncaught exception saat parsing body dan mengembalikan respons 400/422 terstruktur jika gagal.
 *
 * @param req - Objek Request yang memuat body JSON.
 * @param schema - Skema Zod yang menjadi acuan validasi struktur data.
 * @returns Objek ValidationResult yang memuat data ter-parse atau respons error siap kirim.
 */
export async function validateJsonBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return {
      success: false,
      data: null,
      errorResponse: errorResponse("Format JSON body permintaan tidak valid", 400),
    };
  }

  const parseResult = schema.safeParse(rawBody);
  if (!parseResult.success) {
    return {
      success: false,
      data: null,
      errorResponse: errorResponse(
        "Validasi skema payload gagal",
        422,
        parseResult.error.flatten()
      ),
    };
  }

  return {
    success: true,
    data: parseResult.data,
    errorResponse: null,
  };
}
