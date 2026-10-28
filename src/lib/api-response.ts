// Response helper & validator untuk Next.js App Router

import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { ApiResponse } from "@/types/api";

// Standard success response envelope
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(payload, { status });
}

// Standard error response envelope
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

export type ValidationResult<T> =
  | { success: true; data: T; errorResponse: null }
  | { success: false; data: null; errorResponse: NextResponse<ApiResponse<null>> };

// Validasi body JSON dengan Zod schema
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
