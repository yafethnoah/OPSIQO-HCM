import { getActiveOrg, getValidIdToken } from '@/auth/session';
import { getValidAppCheckToken } from '@/security/app-check';

const baseUrl = () =>
  String(process.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

export class ApiTransportError extends Error {
  readonly code = "network_unavailable";

  constructor(message = "OPSIQO could not reach the server. Your session is still active.") {
    super(message);
    this.name = "ApiTransportError";
  }
}

export function isApiTransportError(error: unknown): error is ApiTransportError {
  return error instanceof ApiTransportError;
}

function responseErrorMessage(payload: unknown, status: number) {
  if (typeof payload !== 'object' || !payload) {
    return `Request failed (${status})`;
  }

  const record = payload as Record<string, unknown>;
  const nestedError = record.error;

  if (
    typeof nestedError === 'object' &&
    nestedError &&
    'message' in nestedError &&
    typeof (nestedError as { message?: unknown }).message === 'string'
  ) {
    return String((nestedError as { message: string }).message);
  }

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message;
  }

  return `Request failed (${status})`;
}

function responseErrorCode(payload: unknown) {
  if (typeof payload !== 'object' || !payload) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const nestedError = record.error;

  if (typeof nestedError === 'string' && nestedError.trim()) {
    return nestedError;
  }

  if (
    typeof nestedError === 'object' &&
    nestedError &&
    'code' in nestedError &&
    typeof (nestedError as { code?: unknown }).code === 'string'
  ) {
    return String((nestedError as { code: string }).code);
  }

  if (typeof record.code === 'string' && record.code.trim()) {
    return record.code;
  }

  return undefined;
}

async function performRequest(
  path: string,
  init: RequestInit & { orgId?: string | null },
  forceIdTokenRefresh = false,
  forceAppCheckRefresh = false,
) {
  const [token, appCheckToken] = await Promise.all([
    getValidIdToken({ forceRefresh: forceIdTokenRefresh }),
    getValidAppCheckToken(forceAppCheckRefresh),
  ]);

  if (!token) {
    throw new ApiError("Authentication required.", 401, "unauthenticated");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Firebase-AppCheck", appCheckToken);

  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const orgId =
    init.orgId === null ? null : init.orgId || (await getActiveOrg());

  if (orgId) headers.set("x-org-id", orgId);

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiTransportError();
  }

  const contentType = response.headers.get("content-type") || "";
  let payload: unknown;

  try {
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    payload = null;
  }

  return { response, payload };
}

function isAppCheckFailure(code: string | undefined) {
  return code === "app_check_required" || code === "invalid_app_check";
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { orgId?: string | null } = {},
): Promise<T> {
  let attempt = await performRequest(path, init);
  let code = responseErrorCode(attempt.payload);

  // An explicit HTTP 401 means the server rejected the request before the
  // protected operation ran. Retry once with the appropriate fresh token.
  if (!attempt.response.ok && attempt.response.status === 401) {
    attempt = isAppCheckFailure(code)
      ? await performRequest(path, init, false, true)
      : await performRequest(path, init, true, false);
    code = responseErrorCode(attempt.payload);
  }

  if (!attempt.response.ok) {
    throw new ApiError(
      responseErrorMessage(attempt.payload, attempt.response.status),
      attempt.response.status,
      code,
    );
  }

  return attempt.payload as T;
}
