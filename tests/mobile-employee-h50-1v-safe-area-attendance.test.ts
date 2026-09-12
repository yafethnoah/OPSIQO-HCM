import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.1V safe area and live attendance compatibility", () => {
  it("preserves one governed top safe area while avoiding Home double padding", () => {
    const root = read("mobile/app/_layout.tsx");
    const home = read("mobile/app/(app)/home.tsx");

    expect(root).toContain("SafeAreaProvider, SafeAreaView");
    expect(root).toContain('edges={["top"]}');
    expect(root).toContain('<Stack.Screen name="sign-in" />');
    expect(root).toContain('<Stack.Screen name="select-organization" />');
    expect(root).toContain('<Stack.Screen name="(app)" />');

    expect(home).not.toContain("useSafeAreaInsets");
    expect(home).not.toContain("Math.max(insets.top");
    expect(home).toContain("contentContainerStyle={s.content}");

    const start = home.indexOf("<ScrollView");
    const end = home.indexOf(">", start);
    const opening = home.slice(start, end + 1);
    expect((opening.match(/contentContainerStyle=/g) || []).length).toBe(1);
  });
  it("uses server-authoritative time for normal online Clock In/Out", () => {
    const attendance = read("mobile/src/components/attendance-hero.tsx");
    const route = attendance.indexOf("/time/clock");
    const bodyStart = attendance.indexOf("body: JSON.stringify({", route);
    const bodyEnd = attendance.indexOf("}),", bodyStart);
    const liveBody = attendance.slice(bodyStart, bodyEnd);
    expect(liveBody).toContain("action");
    expect(liveBody).toContain("location: nativeLocation");
    expect(liveBody).not.toContain("clientCapturedAt");
    expect(attendance).toContain("const capturedAt = new Date().toISOString();");
  });
  it("preserves governed offline replay evidence", () => {
    const attendance = read("mobile/src/components/attendance-hero.tsx");
    expect(attendance).toContain("isApiTransportError");
    expect(attendance).toContain("queueOfflineClockEvent");
    expect(attendance).toContain("capturedAt,");
    expect(attendance).toContain('source: "offline_sync"');
    expect(attendance).not.toContain('"device_capture"');
  });
  it("removes reproduced UAT mojibake", () => {
    const home = read("mobile/app/(app)/home.tsx");
    const attendance = read("mobile/src/components/attendance-hero.tsx");
    for (const bad of ["â€¦", "Â·", "â†’"]) {
      expect(home).not.toContain(bad);
      expect(attendance).not.toContain(bad);
    }
  });
  it("keeps the ECG pulse graphic above attendance", () => {
    const home = read("mobile/app/(app)/home.tsx");
    expect(home.indexOf("<AttendancePulseMonitor />")).toBeGreaterThan(-1);
    expect(home.indexOf("<AttendancePulseMonitor />")).toBeLessThan(home.indexOf("<AttendanceHero"));
  });
  it("leaves no trailing whitespace in changed Home and Attendance source", () => {
    const sources = [
      read("mobile/app/(app)/home.tsx"),
      read("mobile/src/components/attendance-hero.tsx"),
    ];
    for (const source of sources) {
      expect(
        source
          .split(String.fromCharCode(10))
          .some(
            (line) =>
              line.endsWith(" ") ||
              line.endsWith(String.fromCharCode(9)),
          ),
      ).toBe(false);
    }
  });
});
