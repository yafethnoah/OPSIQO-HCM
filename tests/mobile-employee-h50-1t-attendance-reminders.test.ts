import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.1T attendance reminder alarms", () => {
  it("schedules exact-date clock-in and clock-out reminders with sound", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");

    expect(source).toContain('"clock_in" | "clock_out"');
    expect(source).toContain("SchedulableTriggerInputTypes.DATE");
    expect(source).toContain('clockInSound: "default"');
    expect(source).toContain('clockOutSound: "default"');
    expect(source).toContain("sound,");
    expect(source).toContain('"Time to clock in"');
    expect(source).toContain('"Time to clock out"');
    expect(source).toContain("shift.startAt");
    expect(source).toContain("shift.endAt");
  });

  it("keeps reminders bounded and clears only OPSIQO-managed scheduled reminders", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");

    expect(source).toContain('const HORIZON_MS = 14 * 24 * 60 * 60 * 1000');
    expect(source).toContain("const MAX_SHIFTS = 14");
    expect(source).toContain('request.content.data?.kind === MANAGED_KIND');
    expect(source).toContain("cancelScheduledNotificationAsync");
    expect(source).not.toContain("cancelAllScheduledNotificationsAsync");
  });

  it("requests notification permission and creates a high-importance Android channel", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");

    expect(source).toContain("getPermissionsAsync");
    expect(source).toContain("requestPermissionsAsync");
    expect(source).toContain("AndroidImportance.HIGH");
    expect(source).toContain("channelId(sound)");
    expect(source).toContain('return `attendance-reminders-${sound.replace');
  });

  it("shows and sounds reminders while the app is foregrounded", () => {
    const layout = read("mobile/app/_layout.tsx");

    expect(layout).toContain("setNotificationHandler");
    expect(layout).toContain("shouldPlaySound: true");
    expect(layout).toContain("shouldShowBanner: true");
    expect(layout).toContain("shouldShowList: true");
  });

  it("opens Time & Attendance when the employee taps a clock reminder", () => {
    const layout = read("mobile/app/_layout.tsx");

    expect(layout).toContain("addNotificationResponseReceivedListener");
    expect(layout).toContain('data?.route === "/time"');
    expect(layout).toContain('router.push("/time")');
  });

  it("surfaces reminder readiness and a settings recovery path on Home", () => {
    const home = read("mobile/app/(app)/home.tsx");

    expect(home).toContain("useAttendanceReminders");
    expect(home).toContain("<H2>Clock reminders</H2>");
    expect(home).toContain("reminders.message");
    expect(home).toContain("Linking.openSettings()");
  });

  it("preserves the existing TestFlight and AdMob release controls", () => {
    const eas = JSON.parse(read("mobile/eas.json"));
    const banner = read("mobile/src/components/ad-banner.tsx");

    expect(eas.build.testflight.distribution).toBe("store");
    expect(eas.build.testflight.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL).toBe(
      "https://uat.opsiqo.ca",
    );
    expect(banner).toContain("TestIds.ADAPTIVE_BANNER");
  });
});
