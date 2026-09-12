import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.1X EAS owner transfer continuity", () => {
  it("moves only the EAS owner to shadykutaifan", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.owner).toBe("shadykutaifan");
    expect(app.expo.extra.h50OwnerTransferTrack).toBe(
      "h50.1x-eas-owner-transfer",
    );
  });

  it("preserves the existing EAS project identity and update URL", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.extra.eas.projectId).toBe(
      "3412f1c1-d7d5-4d3c-b0e6-f7f06b59d5ea",
    );
    expect(app.expo.updates.url).toBe(
      "https://u.expo.dev/3412f1c1-d7d5-4d3c-b0e6-f7f06b59d5ea",
    );
  });

  it("preserves the iOS bundle identity and UAT TestFlight profile", () => {
    const app = JSON.parse(read("mobile/app.json"));
    const eas = JSON.parse(read("mobile/eas.json"));

    expect(app.expo.ios.bundleIdentifier).toBe("ca.opsiqo.employee");
    expect(eas.build.testflight.distribution).toBe("store");
    expect(eas.build.testflight.channel).toBe("uat");
    expect(eas.build.testflight.environment).toBe("preview");
    expect(eas.build.testflight.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL).toBe(
      "https://uat.opsiqo.ca",
    );
  });

  it("keeps the H50.1W user-control release track", () => {
    const app = JSON.parse(read("mobile/app.json"));
    expect(app.expo.extra.h50UserControlsTrack).toBe(
      "h50.1w-global-safe-area-alarm-preferences-persistent-session",
    );
  });
});
