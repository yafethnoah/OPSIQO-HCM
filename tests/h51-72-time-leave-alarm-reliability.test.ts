import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalizeTimeWorkers } from "../src/lib/time/worker-selector";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("H51.72 Time & Leave browser UAT closure", () => {
  it("deduplicates the canonical worker/person identity and legacy visible duplicate", () => {
    const rows = canonicalizeTimeWorkers([
      { id: "old", personId: "person-1", displayName: "Shadi Alktaifan", employeeNumber: "ADMIN-001", status: "inactive", updatedAt: "2026-01-01T00:00:00Z" },
      { id: "current", personId: "person-1", displayName: "Shadi Alktaifan", employeeNumber: "ADMIN-001", status: "active", updatedAt: "2026-09-01T00:00:00Z" },
      { id: "legacy-other-person", personId: "person-legacy", displayName: "Shadi Alktaifan", employeeNumber: "ADMIN-001", status: "inactive", updatedAt: "2025-01-01T00:00:00Z" },
      { id: "employee-2", personId: "person-2", displayName: "Other Employee", employeeNumber: "E003", status: "active" },
    ], "current");

    expect(rows.map((row) => row.id)).toEqual(["current", "employee-2"]);
  });

  it("does not collapse different people merely because an employee number matches", () => {
    const rows = canonicalizeTimeWorkers([
      { id: "a", personId: "pa", displayName: "Alex One", employeeNumber: "E100" },
      { id: "b", personId: "pb", displayName: "Alex Two", employeeNumber: "E100" },
    ]);
    expect(rows).toHaveLength(2);
  });

  it("uses a responsive administrator leave layout", () => {
    const source = read("src/components/time-workspace.tsx");
    const css = read("src/app/globals.css");
    expect(source).toContain('leaveRequestForm adminLeaveForm');
    expect(source).toContain("adminLeaveFormHeader");
    expect(css).toContain("H51.72 Time & Leave browser UAT closure");
    expect(css).toContain("minmax(220px,1fr)");
    expect(css).toContain("word-break:normal");
    expect(css).toContain("@media(max-width:760px)");
  });

  it("preserves H51.71 leave and reason safeguards", () => {
    const source = read("src/components/time-workspace.tsx");
    expect(source).toContain("No enabled leave types configured");
    expect(source).toContain("Leave setup required.");
    expect(source).toContain("Provide an administrative reason of at least 10 characters.");
  });
});

describe("H51.72 native attendance alarm reliability", () => {
  it("declares exact-alarm permission exactly once and removes duplicate Android permissions", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const permissions = app.expo.android.permissions as string[];
    expect(permissions.filter((x) => x === "android.permission.SCHEDULE_EXACT_ALARM")).toHaveLength(1);
    expect(new Set(permissions).size).toBe(permissions.length);
    expect(app.expo.version).toBe("1.0.2");
    expect(app.expo.android.versionCode).toBe(3);
    expect(app.expo.ios.buildNumber).toBe("3");
  });

  it("creates Android channels before prompting and verifies retained native schedules", () => {
    const source = read("mobile/src/notifications/attendance-reminders.ts");
    expect(source).toContain('if (Platform.OS === "android")');
    expect(source).toContain("await ensureAndroidChannel(sound);");
    expect(source.indexOf("await ensureAndroidChannel(sound);")).toBeLessThan(source.indexOf("Notifications.requestPermissionsAsync()"));
    expect(source).toContain("scheduleVerifiedNotification");
    expect(source).toContain("getAllScheduledNotificationsAsync");
    expect(source).toContain("AndroidNotificationPriority.MAX");
    expect(source).toContain('"timeSensitive"');
    expect(source).toContain("DUE_REMINDER_GRACE_MS");
    expect(source).toContain("preserve an exact already-armed native reminder");
  });

  it("surfaces Android Alarms & reminders access in mobile settings", () => {
    const source = read("mobile/src/components/attendance-alarm-settings.tsx");
    expect(source).toContain("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
    expect(source).toContain("Open Android Alarms & reminders access");
    expect(source).toContain("Re-arm Clock In / Clock Out alarms");
  });
});
