import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.2A App Store train 1.0.2", () => {
  it("uses a marketing version higher than the previously approved 1.0.1", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.version).toBe("1.0.2");
    expect(app.expo.extra.h50AppVersionTrack).toBe("h50.2a-app-store-version-1.0.2");
    expect(app.expo.extra.h50AppStoreTrainTrack).toBe("h50.2a-apple-train-1.0.2");
  });

  it("preserves H50.1Z attendance/session release identity", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.extra.h50AttendanceConsistencyTrack).toBe("h50.1z-self-attendance-consistency");
    expect(app.expo.extra.h50UserControlsTrack).toBe("h50.1w-global-safe-area-alarm-preferences-persistent-session");
    expect(app.expo.owner).toBe("shadykutaifan");
  });

  it("preserves EAS, bundle and UAT TestFlight identity", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const eas = JSON.parse(read("mobile/eas.json"));
    expect(app.expo.extra.eas.projectId).toBe("3412f1c1-d7d5-4d3c-b0e6-f7f06b59d5ea");
    expect(app.expo.ios.bundleIdentifier).toBe("ca.opsiqo.employee");
    expect(app.expo.runtimeVersion.policy).toBe("appVersion");
    expect(eas.build.testflight.channel).toBe("uat");
    expect(eas.build.testflight.environment).toBe("preview");
    expect(eas.build.testflight.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL).toBe("https://uat.opsiqo.ca");
  });
});
