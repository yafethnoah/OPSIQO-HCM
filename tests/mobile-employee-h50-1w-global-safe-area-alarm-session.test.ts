import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.1W global safe area, alarm preferences and persistent session", () => {
  it("pins the Expo SDK 57 patch set accepted by the release doctor gate", () => {
    const pkg = JSON.parse(read("mobile/package.json"));
    const expected = {
      expo: "57.0.22",
      "expo-application": "57.0.3",
      "expo-constants": "57.0.18",
      "expo-device": "57.0.2",
      "expo-haptics": "57.0.3",
      "expo-image-picker": "57.0.17",
      "expo-linking": "57.0.10",
      "expo-local-authentication": "57.0.3",
      "expo-location": "57.0.17",
      "expo-notifications": "57.0.18",
      "expo-router": "57.0.21",
      "expo-secure-store": "57.0.4",
      "expo-updates": "57.0.22",
    };

    for (const [name, version] of Object.entries(expected)) {
      expect(pkg.dependencies[name]).toBe(version);
    }
  });

  it("applies one top safe area at the root so every page is protected", () => {
    const root = read("mobile/app/_layout.tsx");
    const home = read("mobile/app/(app)/home.tsx");

    expect(root).toContain("SafeAreaProvider, SafeAreaView");
    expect(root).toContain('edges={["top"]}');
    expect(root).toContain('<Stack.Screen name="sign-in" />');
    expect(root).toContain('<Stack.Screen name="select-organization" />');
    expect(root).toContain('<Stack.Screen name="(app)" />');
    expect(home).not.toContain("useSafeAreaInsets");
    expect(home).toContain("contentContainerStyle={s.content}");
  });

  it("gives users independent Clock In and Clock Out alarm controls", () => {
    const settings = read("mobile/src/components/attendance-alarm-settings.tsx");
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");

    expect(settings).toContain("Clock In alarm");
    expect(settings).toContain("Clock Out alarm");
    expect(settings).toContain("Save alarm settings");
    expect(reminders).toContain("clockInEnabled");
    expect(reminders).toContain("clockOutEnabled");
    expect(reminders).toContain("clockInLeadMinutes");
    expect(reminders).toContain("clockOutLeadMinutes");
  });

  it("supports bundled selectable attendance ring tones and preview", () => {
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");
    const app = read("mobile/app.json");

    for (const sound of [
      "opsiqo-pulse.wav",
      "opsiqo-chime.wav",
      "opsiqo-bell.wav",
    ]) {
      expect(reminders).toContain(sound);
      expect(app).toContain(sound);
      const bytes = readFileSync(`mobile/assets/sounds/${sound}`);
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    }

    expect(reminders).toContain("previewAttendanceAlarmSound");
  });

  it("persists alarm choices securely and reschedules future alarms", () => {
    const reminders = read("mobile/src/notifications/attendance-reminders.ts");

    expect(reminders).toContain("SecureStore.getItemAsync(SETTINGS_KEY)");
    expect(reminders).toContain("SecureStore.setItemAsync(SETTINGS_KEY");
    expect(reminders).toContain("synchronizeAttendanceReminders");
  });

  it("implements persistent sign-in without an app-imposed session timeout", () => {
    const session = read("mobile/src/auth/session.ts");
    const me = read("mobile/app/(app)/me.tsx");

    expect(session).toContain(
      'MOBILE_SESSION_POLICY = "persistent_until_sign_out_or_revocation"',
    );
    expect(session).not.toContain("Your OPSIQO session has expired");
    expect(session).toContain("session.refreshToken");
    expect(session).toContain("session = await refreshSession(session)");
    expect(me).toContain("no app-imposed session timeout");
    expect(me).toContain("administrator revocation");
  });

  it("keeps online attendance server-authoritative and offline capture evidence intact", () => {
    const attendance = read("mobile/src/components/attendance-hero.tsx");
    const route = attendance.indexOf("/time/clock");
    const bodyStart = attendance.indexOf("body: JSON.stringify({", route);
    const bodyEnd = attendance.indexOf("}),", bodyStart);
    const liveBody = attendance.slice(bodyStart, bodyEnd);

    expect(liveBody).not.toContain("clientCapturedAt");
    expect(attendance).toContain('source: "offline_sync"');
  });
});
