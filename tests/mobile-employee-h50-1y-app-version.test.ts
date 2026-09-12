import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.1Y App Store marketing version", () => {
  it("uses a marketing version above the previously approved 1.0.0", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.version).toBe("1.0.1");
    expect(app.expo.extra.h50AppVersionTrack).toBe(
      "h50.1y-app-store-version-1.0.1",
    );
  });

  it("preserves transferred EAS identity and iOS bundle identity", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.owner).toBe("shadykutaifan");
    expect(app.expo.extra.eas.projectId).toBe(
      "3412f1c1-d7d5-4d3c-b0e6-f7f06b59d5ea",
    );
    expect(app.expo.ios.bundleIdentifier).toBe("ca.opsiqo.employee");
  });

  it("preserves app-version runtime policy and UAT TestFlight target", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const eas = JSON.parse(read("mobile/eas.json"));

    expect(app.expo.runtimeVersion.policy).toBe("appVersion");
    expect(app.expo.updates.url).toBe(
      "https://u.expo.dev/3412f1c1-d7d5-4d3c-b0e6-f7f06b59d5ea",
    );
    expect(eas.build.testflight.distribution).toBe("store");
    expect(eas.build.testflight.channel).toBe("uat");
    expect(eas.build.testflight.environment).toBe("preview");
    expect(eas.build.testflight.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL).toBe(
      "https://uat.opsiqo.ca",
    );
  });

  it("preserves H50.1W and H50.1X release tracks", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.extra.h50UserControlsTrack).toBe(
      "h50.1w-global-safe-area-alarm-preferences-persistent-session",
    );
    expect(app.expo.extra.h50OwnerTransferTrack).toBe(
      "h50.1x-eas-owner-transfer",
    );
  });
});
