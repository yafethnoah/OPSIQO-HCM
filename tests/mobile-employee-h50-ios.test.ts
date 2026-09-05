import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.0 OPSIQO Pulse iOS foundation", () => {
  it("rebrands the certified mobile foundation without changing bundle identity", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.name).toBe("OPSIQO Pulse");
    expect(app.expo.ios.bundleIdentifier).toBe("ca.opsiqo.employee");
    expect(app.expo.extra.h50Track).toBe("pulse-ios-v1");
    expect(app.expo.extra.productName).toBe("OPSIQO Pulse");
  });

  it("keeps iOS attendance privacy bounded to foreground action", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const location = app.expo.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-location",
    );
    expect(location).toBeTruthy();
    expect(location[1].isIosBackgroundLocationEnabled).toBe(false);
    expect(app.expo.ios.infoPlist.NSLocationWhenInUseUsageDescription).toContain(
      "only when you submit",
    );
  });

  it("makes governed attendance a first-class Pulse home action", () => {
    const home = read("mobile/app/(app)/home.tsx");
    const time = read("mobile/app/(app)/time.tsx");
    expect(home).toContain("OPSIQO PULSE Â· iOS");
    expect(home).toContain("<AttendanceHero");
    expect(time).toContain("<AttendanceHero");
  });

  it("preserves native biometric and offline attendance evidence", () => {
    const hero = read("mobile/src/components/attendance-hero.tsx");
    expect(hero).toContain('source: "native" as const');
    expect(hero).toContain('"native_biometric" as const');
    expect(hero).toContain('source: "offline_sync"');
    expect(hero).toContain("syncOfflineClockEvents");
    expect(hero).toContain("/time/clock");
    expect(hero).toContain("/time/breaks");
  });

  it("keeps the H47.1F reproducible-build baseline intact", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const pkg = JSON.parse(read("mobile/package.json"));
    const lock = JSON.parse(read("mobile/package-lock.json"));
    expect(app.expo.version).toBe("0.1.2");
    expect(app.expo.extra.h47Release).toBe("employee-mobile-v1.1f");
    expect(pkg.version).toBe("0.2.5");
    expect(lock.lockfileVersion).toBe(3);
  });
});