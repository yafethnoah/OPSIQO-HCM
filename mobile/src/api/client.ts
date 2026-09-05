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

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { orgId?: string | null } = {}
): Promise<T> {
  const [token, appCheckToken] = await Promise.all([
    getValidIdToken(),
    getValidAppCheckToken(),
  ]);

  if (!token) {
    throw new ApiError('Authentication required.', 401, 'unauthenticated');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-Firebase-AppCheck', appCheckToken);

  if (!(init.body instanceof FormData) && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const orgId =
    init.orgId === null ? null : init.orgId || (await getActiveOrg());

  if (orgId) {
    headers.set('x-org-id', orgId);
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(
      responseErrorMessage(payload, response.status),
      response.status,
      responseErrorCode(payload),
    );
  }

  return payload as T;
}