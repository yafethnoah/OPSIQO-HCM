import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("H50.1U pulse monitor graphic", () => {
  it("creates a moving ECG-style graphic component", () => {
    const source = read("mobile/src/components/attendance-pulse-monitor.tsx");
    expect(source).toContain("Heart pulse monitor graphic");
    expect(source).toContain("LIVE PULSE");
    expect(source).toContain("Animated.loop");
    expect(source).toContain("translateX");
    expect(source).toContain("PULSE_PATH");
    expect(source).toContain("react-native-svg");
    expect(source).toContain("pulseGradient-");
    expect(source).toContain('opacity="0.10"');
  });

  it("pins the Expo SDK 57 compatible SVG runtime", () => {
    const pkg = JSON.parse(read("mobile/package.json"));
    expect(pkg.dependencies["react-native-svg"]).toBe("15.15.4");
  });
  it("renders the pulse graphic above the attendance clock hero", () => {
    const home = read("mobile/app/(app)/home.tsx");
    const pulseIndex = home.indexOf("<AttendancePulseMonitor />");
    const heroIndex = home.indexOf("<AttendanceHero");
    expect(home).toContain('import { AttendancePulseMonitor } from "@/components/attendance-pulse-monitor";');
    expect(pulseIndex).toBeGreaterThan(-1);
    expect(heroIndex).toBeGreaterThan(-1);
    expect(pulseIndex).toBeLessThan(heroIndex);
  });
  it("normalizes attendance loading and footer copy to prevent mojibake", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");
    expect(hero).toContain("Please wait...");
    expect(hero).not.toContain("Please waitâ€¦");
    expect(hero).not.toContain("Â·");
  });
});
