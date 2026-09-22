import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { LEAVE_TYPE_STARTER_TEMPLATES } from "../src/lib/time/leave-type-templates";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("H51.73 inline leave-type administration", () => {
  it("provides governed starter leave labels without assuming legal entitlement", () => {
    expect(LEAVE_TYPE_STARTER_TEMPLATES.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "Vacation",
        "Sick Leave",
        "Personal Leave",
        "Bereavement Leave",
        "Family / Caregiver Leave",
        "Unpaid Leave",
        "Other Leave",
      ]),
    );
    const source = read("src/lib/time/leave-type-templates.ts");
    expect(source).not.toContain("jobProtected");
    expect(source).not.toContain("statutory");
  });

  it("lets an administrator create and automatically select a leave type in the employee workflow", () => {
    const source = read("src/components/time-workspace.tsx");
    expect(source).toContain("+ New leave type");
    expect(source).toContain("Create &amp; select leave type");
    expect(source).toContain("LEAVE_TYPE_STARTER_TEMPLATES");
    expect(source).toContain("setAdminLeaveTypeId(result.data.id)");
    expect(source).toContain("OPSIQO does not infer legal entitlement");
    expect(source).toContain("No enabled leave types configured");
  });
});

describe("H51.73 server notification delivery closure", () => {
  it("binds attendance server pushes to the Android attendance channel", () => {
    expect(read("src/lib/time/attendance-admin-service.ts")).toContain(
      "channelId:'attendance-reminders-default'",
    );
    expect(read("src/lib/time/attendance-reminder-server.ts")).toContain(
      "channelId:'attendance-reminders-default'",
    );
  });

  it("creates the Android channel before direct notification permission registration", () => {
    const source = read("mobile/src/mobile/device.ts");
    const channel = source.indexOf("setNotificationChannelAsync('attendance-reminders-default'");
    const request = source.indexOf("Notifications.requestPermissionsAsync()");
    expect(channel).toBeGreaterThan(-1);
    expect(request).toBeGreaterThan(-1);
    expect(channel).toBeLessThan(request);
    expect(source).toContain("EAS project ID is missing");
  });

  it("provides an authenticated server-to-device push self-test", () => {
    const service = read("src/lib/mobile/service.ts");
    const route = read(
      "src/app/api/organizations/[orgId]/mobile/devices/test-notification/route.ts",
    );
    expect(service).toContain("sendMobilePushSelfTest");
    expect(service).toContain("OPSIQO server notification test");
    expect(service).toContain("pushCapableDevices");
    expect(service).toContain("attendance-reminders-default");
    expect(route).toContain("sendMobilePushSelfTest");
  });

  it("makes push repair visible instead of relying only on a swallowed background attempt", () => {
    const settings = read("mobile/src/components/attendance-alarm-settings.tsx");
    const layout = read("mobile/app/(app)/_layout.tsx");
    expect(settings).toContain("Repair & test server notifications");
    expect(settings).toContain("/mobile/devices/test-notification");
    expect(settings).toContain("real server-to-device push path");
    expect(layout).toContain("await registerDevice(activeOrgId, { requestPush: true })");
    expect(layout).toContain("if (!cancelled) await reload()");
    expect(layout).toContain('AppState.addEventListener("change"');
  });

  it("makes admin broadcast push-readiness failure visible", () => {
    const source = read("src/components/time-workspace.tsx");
    expect(source).toContain("none of the");
    expect(source).toContain("push-ready Pulse device");
    expect(source).toContain("Repair & test server notifications");
    expect(source).toContain("Notification provider accepted");
  });

  it("preserves H51.72 native alarm reliability", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const alarm = read("mobile/src/notifications/attendance-reminders.ts");
    expect(app.expo.android.permissions).toContain(
      "android.permission.SCHEDULE_EXACT_ALARM",
    );
    expect(app.expo.ios.entitlements[
      "com.apple.developer.usernotifications.time-sensitive"
    ]).toBe(true);
    expect(alarm).toContain("scheduleVerifiedNotification");
    expect(alarm).toContain("AndroidNotificationPriority.MAX");
  });
});
