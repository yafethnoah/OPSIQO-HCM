import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H51.59 automatic attendance reminder intelligence", () => {
  it("mounts the reminder engine globally after authenticated workspace restoration", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    expect(layout).toContain("AttendanceReminderCoordinator");
    expect(layout).toContain("useBootstrap");
    expect(layout).toContain("useAttendanceReminders");
    expect(layout).toContain("Boolean(data)");
  });

  it("resynchronizes reminders whenever Pulse returns to the foreground", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");
    expect(source).toContain('AppState.addEventListener("change"');
    expect(source).toContain('nextState === "active"');
    expect(source).toContain("void resync()");
  });

  it("does not request notification setup before mobile bootstrap is available", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    const source = read("mobile/src/notifications/attendance-reminders.ts");
    expect(layout).toContain("Boolean(data)");
    expect(source).toContain("if (!enabled)");
  });

  it("clears stale managed reminders before every authoritative resync", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");
    expect(source).toContain("export async function clearAttendanceReminders");
    expect(source).toContain("await clearAttendanceReminders()");
  });

  it("uses the live attendance state to suppress obsolete reminders", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    const source = read("mobile/src/notifications/attendance-reminders.ts");
    expect(layout).toContain("isClockedIn");
    expect(source).toContain("context.isClockedIn !== true");
    expect(source).toContain("context.isClockedIn !== false");
  });

  it("provides an immediate notification test and notification-settings recovery", () => {
    const settings = read("mobile/src/components/attendance-alarm-settings.tsx");
    expect(settings).toContain("Send test notification now");
    expect(settings).toContain("Open device notification settings");
    expect(settings).toContain("Linking.openSettings()");
  });

  it("truthfully reports that a schedule is required when no shift is assigned", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");
    expect(source).toContain("No upcoming work schedule is assigned");
  });

  it("keeps attendance reminder intelligence free of background location tracking", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");
    expect(source).not.toContain("watchPositionAsync");
    expect(source).not.toContain("startLocationUpdatesAsync");
  });
});