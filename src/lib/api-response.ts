// Modul Pembungkus Respons API Terstandarisasi dan Validator Skema (PSR-3).
// Menyediakan amplop respons seragam (envelope) untuk status sukses dan galat,
// serta pembantu validasi muatan JSON berbasis Zod schema untuk Next.js App Router.

import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { ApiResponse } from "@/types/api";

// Membungkus data muatan sukses ke dalam amplop standar ApiResponse<T>.
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  // Amplop sukses: success=true, data, dan waktu respons dalam ISO.
  const payload: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(payload, { status });
}

// Membungkus pesan kesalahan ke dalam amplop standar ApiResponse<null>.
export function errorResponse(
  error: string,
  status = 400,
  details?: unknown
): NextResponse<ApiResponse<null>> {
  // Amplop galat: details hanya disertakan bila ada (misalnya hasil validasi Zod).
  const payload: ApiResponse<null> = {
    success: false,
    error,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(payload, { status });
}

// Tipe diskriminasi gabungan untuk hasil validasi muatan JSON.
// Memisahkan kondisi valid (berisi data T) dan tidak valid (berisi errorResponse siap kirim).
export type ValidationResult<T> =
  | { success: true; data: T; errorResponse: null }
  | { success: false; data: null; errorResponse: NextResponse<ApiResponse<null>> };

// Mem-parsing dan memvalidasi muatan body JSON permintaan terhadap skema Zod yang ditentukan.
// Mencegah uncaught exception saat parsing body dan mengembalikan respons 400/422 terstruktur jika gagal.
export async function validateJsonBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  // Body dibaca dulu sebagai unknown karena belum tentu JSON valid.
  let rawBody: unknown;
  try {
    // Body bukan JSON: balas 400, bukan lempar galat.
    rawBody = await req.json();
  } catch {
    return {
      success: false,
      data: null,
      errorResponse: errorResponse("Format JSON body permintaan tidak valid", 400),
    };
  }

  // Validasi skema; kegagalan dibalas 422 dengan rincian per field.
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
