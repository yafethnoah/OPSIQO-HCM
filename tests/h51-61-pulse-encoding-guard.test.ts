import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H51.61 Pulse encoding guard", () => {
  it("uses ASCII-safe separators in Home", () => {
    const home = read("mobile/app/(app)/home.tsx");
    expect(home).toContain("OPSIQO PULSE - iOS");
    expect(home).toContain(" to");
    expect(home).not.toContain("Ã‚");
    expect(home).not.toContain("Ã¢");
    expect(home).not.toContain("Ãƒ");
  });

  it("uses ASCII-safe shift ranges in Time", () => {
    const time = read("mobile/app/(app)/time.tsx");
    expect(time).toContain('to{" "}');
    expect(time).not.toContain("Ã‚");
    expect(time).not.toContain("Ã¢");
    expect(time).not.toContain("Ãƒ");
  });

  it("keeps H51.60 SVG navigation intact", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    expect(layout).toContain("PulseTabIcon");
    expect(layout).toContain('icon("home")');
    expect(layout).toContain('icon("time")');
  });

  it("keeps the H51.59 global reminder coordinator intact", () => {
    const layout = read("mobile/app/(app)/_layout.tsx");
    expect(layout).toContain("AttendanceReminderCoordinator");
    expect(layout).toContain("useAttendanceReminders");
  });
});