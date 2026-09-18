import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H51.62 regular schedule attendance reminders", () => {
  it("adds regular schedule fallback when no shift is published", () => {
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");
    const settings = read("mobile/src/components/attendance-alarm-settings.tsx");

    expect(reminders).toContain("regularScheduleEnabled");
    expect(reminders).toContain("regularWorkDays");
    expect(reminders).toContain("regularStartLocalTime");
    expect(reminders).toContain("regularEndLocalTime");
    expect(settings).toContain("Regular schedule fallback");
  });

  it("uses published shifts only and excludes draft shifts", () => {
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");

    expect(reminders).toContain('shift.status?.toLowerCase() !== "published"');
    expect(reminders).toContain("publishedDays");
    expect(reminders).toContain("uncoveredRegular");
  });

  it("lets a published shift override regular fallback on the same local day", () => {
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");

    expect(reminders).toContain("!publishedDays.has");
    expect(reminders).toContain('"published_shift"');
    expect(reminders).toContain('"regular_schedule"');
  });

  it("adds a delayed one-minute timing test using a DATE trigger", () => {
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");
    const settings = read("mobile/src/components/attendance-alarm-settings.tsx");

    expect(reminders).toContain("scheduleTimedAttendanceTest");
    expect(reminders).toContain("SchedulableTriggerInputTypes.DATE");
    expect(settings).toContain("Schedule 1-minute timing test");
  });

  it("shows schedule source, scheduled count and next alarm", () => {
    const settings = read("mobile/src/components/attendance-alarm-settings.tsx");

    expect(settings).toContain("Schedule source:");
    expect(settings).toContain("Scheduled alarms:");
    expect(settings).toContain("Next alarm:");
  });

  it("passes live attendance state into manual schedule synchronization", () => {
    const time = read("mobile/app/(app)/time.tsx");
    const settings = read("mobile/src/components/attendance-alarm-settings.tsx");

    expect(time).toContain("isClockedIn");
    expect(time).toContain("isClockedIn={isClockedIn}");
    expect(settings).toContain("{ isClockedIn }");
  });

  it("preserves foreground-only location privacy", () => {
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");
    const time = read("mobile/app/(app)/time.tsx");

    expect(reminders).not.toContain("watchPositionAsync");
    expect(reminders).not.toContain("startLocationUpdatesAsync");
    expect(time).toContain("does not enable background location");
  });
});
