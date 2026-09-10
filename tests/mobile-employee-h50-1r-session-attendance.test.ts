import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.1R Pulse session and attendance reliability", () => {
  it("treats an encrypted stored session as authenticated without requiring network refresh", () => {
    const session = read("mobile/src/auth/session.ts");
    expect(session).toContain("export async function hasSession()");
    expect(session).toContain("SecureStore.getItemAsync(SESSION_KEY)");
    expect(session).toContain("forceRefreshIdToken");
    const hasSession = session.slice(session.indexOf("export async function hasSession()"), session.indexOf("export async function forceRefreshIdToken"));
    expect(hasSession).not.toContain("getValidIdToken()");
  });

  it("retries explicit 401 token rejection once and distinguishes transport failures", () => {
    const api = read("mobile/src/api/client.ts");
    expect(api).toContain("ApiTransportError");
    expect(api).toContain("network_unavailable");
    expect(api).toContain("attempt.response.status === 401");
    expect(api).toContain("getValidIdToken({ forceRefresh: forceIdTokenRefresh })");
    expect(api).toContain("getValidAppCheckToken(forceAppCheckRefresh)");
  });

  it("does not destroy a valid session on transient organization bootstrap failure", () => {
    const provider = read("mobile/src/auth/provider.tsx");
    expect(provider).toContain("setAuthenticated(ok)");
    expect(provider).toContain("const storedOrg = await getActiveOrg()");
    expect(provider).toContain("isTerminalSessionRejection");
    expect(provider).toContain("if (isTerminalSessionRejection(error))");
  });

  it("queues only transport failures and never labels a failed attendance action as synced", () => {
    const attendance = read("mobile/src/components/attendance-hero.tsx");
    expect(attendance).toContain("isApiTransportError");
    expect(attendance).toContain('setSyncHealth("pending")');
    expect(attendance).toContain('setSyncHealth("attention")');
    expect(attendance).toContain("NEEDS ATTENTION");
    expect(attendance).toContain("const eventId = uuid()");
  });

  it("keeps the existing foreground-only location privacy boundary", () => {
    const attendance = read("mobile/src/components/attendance-hero.tsx");
    expect(attendance).toContain("requestForegroundPermissionsAsync");
    expect(attendance).toContain("getCurrentPositionAsync");
    expect(attendance).not.toContain("watchPositionAsync");
    expect(attendance).not.toContain("startLocationUpdatesAsync");
  });
});
