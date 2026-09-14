import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.1Z self attendance consistency", () => {
  it("limits mobile bootstrap live attendance to the signed-in worker", () => {
    const service = read("src/lib/mobile/service.ts");

    expect(service).toContain("function selfAttendance(");
    expect(service).toContain(
      "snapshot.working.filter((row) => row.workerId === workerId)",
    );
    expect(service).toContain(
      "snapshot.onBreak.filter((row) => row.workerId === workerId)",
    );
    expect(service).toContain(
      ".then((snapshot) => selfAttendance(snapshot, workerId))",
    );
  });

  it("filters the attendance hero again by actor.workerId", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");

    expect(hero).toContain("const selfAttendance = useMemo(() =>");
    expect(hero).toContain("const workerId = data?.actor?.workerId;");
    expect(hero).toContain("row?.workerId === workerId");
    expect(hero).toContain(
      "const canClock = Boolean(data?.capabilities.clock && data?.actor?.workerId);",
    );
  });

  it("refreshes authoritative state when clock-out detects an inconsistent open entry", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");

    expect(hero).toContain('error.code === "clock_state_invalid"');
    expect(hero).toContain("await onReload();");
    expect(hero).toContain(
      "Your attendance status changed on the server",
    );
  });

  it("preserves persistent-until-sign-out-or-revocation session policy", () => {
    const session = read("mobile/src/auth/session.ts");
    const provider = read("mobile/src/auth/provider.tsx");

    expect(session).toContain(
      'MOBILE_SESSION_POLICY = "persistent_until_sign_out_or_revocation"',
    );
    expect(session).toContain("session = await refreshSession(session)");
    expect(provider).toContain(
      "A valid encrypted session remains authenticated when organization",
    );
  });

  it("preserves H50.1Y App Store and EAS identity", () => {
    const app = JSON.parse(read("mobile/app.json"));

    expect(app.expo.version).toBe("1.0.2");
    expect(app.expo.owner).toBe("shadykutaifan");
    expect(app.expo.extra.eas.projectId).toBe(
      "3412f1c1-d7d5-4d3c-b0e6-f7f06b59d5ea",
    );
    expect(app.expo.ios.bundleIdentifier).toBe("ca.opsiqo.employee");
    expect(app.expo.extra.h50AttendanceConsistencyTrack).toBe(
      "h50.1z-self-attendance-consistency",
    );
  });
});
