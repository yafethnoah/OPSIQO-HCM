export type ApiErrorPayload = {
  error?: unknown;
  code?: unknown;
  message?: unknown;
  details?: unknown;
  issues?: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code || 'api_error';
    this.details = details;
  }
}

export function apiRequestErrorFromPayload(status: number, payload: unknown, fallback: string): ApiRequestError {
  const body = typeof payload === 'object' && payload !== null ? payload as ApiErrorPayload : {};
  const code = String(body.code ?? body.error ?? 'api_error');
  const message = String(body.message ?? fallback);
  const details = body.details ?? body.issues;
  return new ApiRequestError(status, code, message, details);
}

export function isMfaRequiredError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 403 && error.code === 'mfa_required';
}

export function isSessionExpiredError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 401 && error.code === 'session_expired';
}
