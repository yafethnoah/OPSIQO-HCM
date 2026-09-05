import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

function pngMeta(path: string) {
  const buffer = readFileSync(path);

  expect(buffer.subarray(1, 4).toString("ascii")).toBe("PNG");

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

describe("H50.1O 3D Pulse icon and live attendance clock", () => {
  it("publishes the exact 1024x1024 production 3D icon for iOS and Android", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const master = pngMeta("mobile/assets/opsiqo-pulse-3d-icon.png");
    const adaptive = pngMeta(
      "mobile/assets/opsiqo-pulse-3d-adaptive-foreground.png",
    );

    expect(app.expo.version).toBe("0.1.5");
    expect(app.expo.icon).toBe("./assets/opsiqo-pulse-3d-icon.png");
    expect(app.expo.ios.icon).toBe("./assets/opsiqo-pulse-3d-icon.png");
    expect(app.expo.android.icon).toBe("./assets/opsiqo-pulse-3d-icon.png");
    expect(app.expo.android.adaptiveIcon.foregroundImage).toBe(
      "./assets/opsiqo-pulse-3d-adaptive-foreground.png",
    );
    expect(app.expo.android.adaptiveIcon.backgroundColor).toBe("#EAF7FC");

    expect(master).toEqual({
      width: 1024,
      height: 1024,
      colorType: 2,
      sha256: "6e015a225e886b0ecf0ceccf8727b12eef6c6bc8413e956835921be5fccffd6e",
    });

    expect(adaptive).toEqual({
      width: 1024,
      height: 1024,
      colorType: 6,
      sha256: "354432fff95c0b4c9662ae65071ce3cc01e87886a2ebbbecc5be265f4db9a939",
    });
  });

  it("updates live time every second and pulses once on every aligned tick", () => {
    const clock = read("mobile/src/components/live-pulse-clock.tsx");

    expect(clock).toContain("second: \"2-digit\"");
    expect(clock).toContain("1000 - (Date.now() % 1000)");
    expect(clock).toContain("Animated.sequence");
    expect(clock).toContain("Animated.timing(pulse");
    expect(clock).toContain("Animated.timing(secondMotion");
    expect(clock).toContain('outputRange: ["0deg", "360deg"]');
    expect(clock).toContain("WORK ELAPSED");
    expect(clock).toContain("elapsedHms");
    expect(clock).toContain("isReduceMotionEnabled");
  });

  it("places the live moving clock in both attendance surfaces through AttendanceHero", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");
    const home = read("mobile/app/(app)/home.tsx");
    const time = read("mobile/app/(app)/time.tsx");

    expect(hero).toContain('from "@/components/live-pulse-clock"');
    expect(hero).toContain("<LivePulseClock");
    expect(home).toContain("<AttendanceHero");
    expect(time).toContain("<AttendanceHero");
  });

  it("does not replace governed attendance authority with device time", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");
    const clock = read("mobile/src/components/live-pulse-clock.tsx");

    expect(hero).toContain("/time/clock");
    expect(hero).toContain('source: "native" as const');
    expect(hero).toContain("native_biometric");
    expect(clock).toContain(
      "OPSIQO server time remains authoritative",
    );
  });
});