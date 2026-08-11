import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'api_error') {
    super(message);
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'validation_error',
      message: 'Request validation failed.',
      issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: 'internal_error', message: 'Unexpected server error.' }, { status: 500 });
}
