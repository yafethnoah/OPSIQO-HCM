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
    const message =
      typeof payload === 'object' && payload
        ? String(
            (payload as any).error?.message ||
              (payload as any).message ||
              `Request failed (${response.status})`
          )
        : `Request failed (${response.status})`;

    const code =
      typeof payload === 'object' && payload
        ? String((payload as any).error?.code || (payload as any).code || '')
        : undefined;

    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}