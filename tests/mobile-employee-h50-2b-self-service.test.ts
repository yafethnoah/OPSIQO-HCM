import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.2B Pulse mobile self-service", () => {
  it("keeps privileged web/admin MFA while mobile uses a separate least-privileged actor", () => {
    const auth = read("src/lib/auth/session.ts");

    expect(auth).toContain("export async function actorFromRequest");
    expect(auth).toContain("enforcePrivilegedIdentityPolicy(identity,role)");
    expect(auth).toContain("enforcePlatformIdentityPolicy(identity,role,platform)");

    const start = auth.indexOf(
      "export async function actorFromMobileSelfServiceRequest",
    );
    const end = auth.indexOf("const TEAM_PERMISSION_FALLBACK", start);
    const mobile = auth.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(mobile).toContain("identityFromRequest(request)");
    expect(mobile).toContain("permissionsForRole('employee')");
    expect(mobile).toContain("resolveMobileWorkerId");
    expect(mobile).not.toContain("enforcePrivilegedIdentityPolicy(");
    expect(mobile).not.toContain("enforcePlatformIdentityPolicy(");
    expect(mobile).not.toContain("sessionTimeoutMinutes");
  });

  it("keeps the normal web attendance route privileged and adds mobile attendance routes", () => {
    const webClock = read(
      "src/app/api/organizations/[orgId]/time/clock/route.ts",
    );
    const mobileClock = read(
      "src/app/api/organizations/[orgId]/mobile/time/clock/route.ts",
    );
    const mobileBreak = read(
      "src/app/api/organizations/[orgId]/mobile/time/breaks/route.ts",
    );

    expect(webClock).toContain("actorFromRequest");
    expect(webClock).not.toContain("actorFromMobileSelfServiceRequest");

    expect(mobileClock).toContain("actorFromMobileSelfServiceRequest");
    expect(mobileClock).toContain("requirePermission(actor, 'time.clock')");
    expect(mobileBreak).toContain("actorFromMobileSelfServiceRequest");
    expect(mobileBreak).toContain("recordBreak");
  });

  it("uses mobile-only self-service endpoints from Pulse", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");
    const offline = read("mobile/src/mobile/offline-attendance.ts");
    const requests = read("mobile/app/(app)/requests.tsx");

    expect(hero).toContain("/mobile/time/clock");
    expect(hero).toContain("/mobile/time/breaks");
    expect(offline).toContain("/mobile/time/clock");
    expect(requests).toContain("/mobile/leave/requests");
    expect(requests).toContain("/mobile/expenses");
  });

  it("keeps Clock In visible and exposes Clock Out plus Break from authoritative state", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");

    expect(hero).toContain('active ? "Clock out" : "Clock in"');
    expect(hero).toContain('onBreak ? "End break" : "Start break"');
    expect(hero).toContain("Attendance controls stay visible");
    expect(hero).toContain("data?.actor?.workerId");
  });

  it("recovers an unlinked mobile worker only from strong or unique verified identity evidence", () => {
    const auth = read("src/lib/auth/session.ts");

    expect(auth).toContain(".where('authUid', '==', identity.uid)");
    expect(auth).toContain("identity.emailVerified && identity.email");
    expect(auth).toContain(".where('workEmailLower', '==', normalizedEmail)");
    expect(auth).toContain("if (lowerSnap.size === 1)");
    expect(auth).not.toContain("membership.workerId =");
  });

  it("uses last-good bootstrap cache and request dedupe for fast tab navigation", () => {
    const hook = read("mobile/src/hooks/use-bootstrap.ts");

    expect(hook).toContain("const bootstrapCache = new Map");
    expect(hook).toContain("const bootstrapRequests = new Map");
    expect(hook).toContain("Never blank a healthy screen");
    expect(hook).toContain("bootstrapRequests.get(orgId)");
    expect(hook).toContain("setData(lastGood)");
  });

  it("parallelizes the server bootstrap and requires a worker for clock capability", () => {
    const service = read("src/lib/mobile/service.ts");

    expect(service).toContain(
      "const [home, leave, shifts, attendance, expenses, notifications, learning, documents, reminderDevices] = await Promise.all([",
    );
    expect(service).toContain("attendanceReminderReliability");
    expect(service).toContain("superAppDashboard(actor)");
    expect(service).toContain(
      "clock: Boolean(workerId && can('time.clock'))",
    );
  });

  it("preserves persistent mobile session and H50.2A/App Store identity", () => {
    const session = read("mobile/src/auth/session.ts");
    const app = JSON.parse(read("mobile/app.json"));

    expect(session).toContain(
      'MOBILE_SESSION_POLICY = "persistent_until_sign_out_or_revocation"',
    );
    expect(app.expo.version).toBe("1.0.2");
    expect(app.expo.owner).toBe("shadykutaifan");
    expect(app.expo.extra.eas.projectId).toBe(
      "3412f1c1-d7d5-4d3c-b0e6-f7f06b59d5ea",
    );
    expect(app.expo.ios.bundleIdentifier).toBe("ca.opsiqo.employee");
    expect(app.expo.extra.h50AttendanceConsistencyTrack).toBe(
      "h50.1z-self-attendance-consistency",
    );
    expect(app.expo.extra.h50MobileSelfServiceTrack).toBe(
      "h50.2b-no-mfa-visible-attendance-fast-bootstrap",
    );
  });
});
