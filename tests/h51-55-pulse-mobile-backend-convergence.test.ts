import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(path, "utf8");

describe("H51.55 Pulse mobile backend convergence", () => {
  it("adds Clock and Break routes required by Pulse Build 26", () => {
    const clock = read("src/app/api/organizations/[orgId]/mobile/time/clock/route.ts");
    const breaks = read("src/app/api/organizations/[orgId]/mobile/time/breaks/route.ts");
    expect(clock).toContain("actorFromMobileSelfServiceRequest");
    expect(clock).toContain("requirePermission(actor, 'time.clock')");
    expect(breaks).toContain("recordBreak");
  });

  it("uses a mobile self-service actor without organization session timeout", () => {
    const bootstrap = read("src/app/api/organizations/[orgId]/mobile/bootstrap/route.ts");
    const session = read("src/lib/auth/session.ts");
    expect(bootstrap).toContain("actorFromMobileSelfServiceRequest");
    expect(bootstrap).not.toContain("actorFromRequest(request, orgId)");
    const start = session.indexOf("export async function actorFromMobileSelfServiceRequest");
    const end = session.indexOf("const TEAM_PERMISSION_FALLBACK", start);
    const mobile = session.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(mobile).toContain("identityFromRequest(request)");
    expect(mobile).toContain("permissionsForRole('employee')");
    expect(mobile).toContain("resolveMobileWorkerId");
    expect(mobile).not.toContain("sessionTimeoutMinutes");
    expect(mobile).not.toContain("enforcePlatformIdentityPolicy(");
  });

  it("keeps H51.54 web actor behavior in place", () => {
    const session = read("src/lib/auth/session.ts");
    expect(session).toContain("export async function actorFromRequest(request: Request, orgId?: string)");
    expect(session).toContain("enforcePlatformIdentityPolicy(identity,role,platform)");
  });

  it("adds mobile leave and expense routes", () => {
    expect(read("src/app/api/organizations/[orgId]/mobile/leave/requests/route.ts"))
      .toContain("actorFromMobileSelfServiceRequest");
    expect(read("src/app/api/organizations/[orgId]/mobile/expenses/route.ts"))
      .toContain("actorFromMobileSelfServiceRequest");
    expect(read("src/app/api/organizations/[orgId]/mobile/expenses/[claimId]/route.ts"))
      .toContain("actorFromMobileSelfServiceRequest");
  });

  it("parallelizes bootstrap and guards Clock capability by worker link", () => {
    const service = read("src/lib/mobile/service.ts");
    expect(service).toContain("const [home, leave, shifts, attendance, expenses, notifications, learning, documents] = await Promise.all([");
    expect(service).toContain("superAppDashboard(actor)");
    expect(service).toContain("clock: Boolean(workerId && can('time.clock'))");
  });
});
