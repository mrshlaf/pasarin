/**
 * PASARIN API Response Helpers & Runtime Zod Request Body Validator
 * Aligned with PRD_FIX_PASARIN.md Section 15.4 (Jira PSR-3)
 *
 * Provides typed standard envelope constructors and runtime schema validation
 * for all Next.js 14 App Router API endpoints.
 */

import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { ApiResponse } from "@/types/api";

/**
 * Constructs a standardized HTTP success response envelope
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
 * Constructs a standardized HTTP error response envelope
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

export type ValidationResult<T> =
  | { success: true; data: T; errorResponse: null }
  | { success: false; data: null; errorResponse: NextResponse<ApiResponse<null>> };

/**
 * Parses and validates an incoming JSON request body against a Zod schema.
 * Returns either validated typed data or a ready-to-return 400 Bad Request response.
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
      errorResponse: errorResponse("Invalid JSON format in request body", 400),
    };
  }

  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const errorDetails = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return {
      success: false,
      data: null,
      errorResponse: errorResponse("Request body validation failed", 422, errorDetails),
    };
  }

  return {
    success: true,
    data: result.data,
    errorResponse: null,
  };
}
