import { NextResponse } from "next/server";

export function apiError(
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: { error: string; details?: unknown } = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
