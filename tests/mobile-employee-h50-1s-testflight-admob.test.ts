import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.1S TestFlight + AdMob banner readiness", () => {
  it("uses a store-signed TestFlight profile against UAT", () => {
    const eas = JSON.parse(read("mobile/eas.json"));
    expect(eas.build.testflight.distribution).toBe("store");
    expect(eas.build.testflight.channel).toBe("uat");
    expect(eas.build.testflight.autoIncrement).toBe(true);
    expect(eas.build.testflight.env.EXPO_PUBLIC_OPSIQO_ENVIRONMENT).toBe("uat");
    expect(eas.build.testflight.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL).toBe(
      "https://uat.opsiqo.ca",
    );
    expect(eas.submit.testflight).toBeTruthy();
  });

  it("configures Google Mobile Ads with test-only fallback app IDs", () => {
    const config = read("mobile/app.config.js");
    expect(config).toContain("react-native-google-mobile-ads");
    expect(config).toContain("ca-app-pub-3940256099942544~1458002511");
    expect(config).toContain("EXPO_PUBLIC_ADMOB_IOS_APP_ID");
    expect(config).toContain("EXPO_PUBLIC_ADMOB_IOS_BANNER_ID");
    expect(config).toContain("Production iOS builds require");
  });

  it("uses Google test banners outside production and non-personalized requests", () => {
    const banner = read("mobile/src/components/ad-banner.tsx");
    expect(banner).toContain("TestIds.ADAPTIVE_BANNER");
    expect(banner).toContain("BannerAdSize.ANCHORED_ADAPTIVE_BANNER");
    expect(banner).toContain("requestNonPersonalizedAdsOnly: true");
    expect(banner).toContain("useForeground");
    expect(banner).toContain("bannerRef.current?.load()");
    expect(banner).toContain("EXPO_PUBLIC_ADMOB_IOS_BANNER_ID");
  });

  it("initializes the SDK and renders the banner only inside the authenticated home", () => {
    const layout = read("mobile/app/_layout.tsx");
    const home = read("mobile/app/(app)/home.tsx");
    expect(layout).toContain('mobileAds from "react-native-google-mobile-ads"');
    expect(layout).toContain(".initialize()");
    expect(home).toContain('OpsiqoBannerAd');
    expect(home).toContain("<OpsiqoBannerAd />");
  });

  it("includes the native ads package dependency", () => {
    const pkg = JSON.parse(read("mobile/package.json"));
    expect(pkg.dependencies["react-native-google-mobile-ads"]).toBeTruthy();
  });
});
