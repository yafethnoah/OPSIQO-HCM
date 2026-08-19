export type InvitationReturnContext = {
  orgId: string;
  token: string;
};

const SAFE_ORG_ID = /^[A-Za-z0-9._-]{2,200}$/;

export function invitationContextFromReturnTo(returnTo: string): InvitationReturnContext | null {
  const normalized = String(returnTo || '').trim();
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized, 'https://opsiqo.invalid');
    if (parsed.origin !== 'https://opsiqo.invalid') return null;
    if (parsed.pathname !== '/accept-invite') return null;

    const orgId = String(parsed.searchParams.get('orgId') || '').trim();
    const token = String(parsed.searchParams.get('token') || '').trim();

    if (!SAFE_ORG_ID.test(orgId) || token.length < 16) return null;
    return { orgId, token };
  } catch {
    return null;
  }
}
