import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H51.60 Pulse navigation and reminder UX", () => {
  it("uses deterministic SVG tab icons instead of encoding-sensitive text glyphs", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    const icon = read("mobile/src/components/pulse-tab-icon.tsx");

    expect(layout).toContain("PulseTabIcon");
    expect(icon).toContain("react-native-svg");
    expect(layout).not.toMatch(/[ÃƒÃ‚Ã¢]/);
  });

  it("keeps a single authoritative automatic reminder coordinator", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    const home = read("mobile/app/(app)/home.tsx");

    expect(layout).toContain("AttendanceReminderCoordinator");
    expect(layout).toContain("useAttendanceReminders");
    expect(home).not.toContain("useAttendanceReminders");
  });

  it("makes the no-shift reminder state explicit and actionable", () => {
    const home = read("mobile/app/(app)/home.tsx");

    expect(home).toContain("No upcoming published shift is available");
    expect(home).toContain("Open clock alarms");
    expect(home).toContain('router.push("/time")');
  });

  it("keeps Home and Time content clear of the persistent tab bar", () => {
    const home = read("mobile/app/(app)/home.tsx");
    const time = read("mobile/app/(app)/time.tsx");

    expect(home).toContain("paddingBottom: 112");
    expect(time).toContain("paddingBottom: 112");
  });

  it("does not change background-location privacy", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    const home = read("mobile/app/(app)/home.tsx");

    expect(layout).not.toContain("watchPositionAsync");
    expect(home).not.toContain("watchPositionAsync");
  });
});