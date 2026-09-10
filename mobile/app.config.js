module.exports = ({ config }) => {
  const googleServicesPlist = process.env.GOOGLE_SERVICES_PLIST;
  const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;
  const environment = process.env.EXPO_PUBLIC_OPSIQO_ENVIRONMENT || "development";
  const production = environment === "production";

  const TEST_IOS_ADMOB_APP_ID = "ca-app-pub-3940256099942544~1458002511";
  const TEST_ANDROID_ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713";

  const iosAdMobAppId =
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
    (production ? "" : TEST_IOS_ADMOB_APP_ID);

  const androidAdMobAppId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
    (production ? "" : TEST_ANDROID_ADMOB_APP_ID);

  if (production && !iosAdMobAppId) {
    throw new Error(
      "Production iOS builds require EXPO_PUBLIC_ADMOB_IOS_APP_ID.",
    );
  }

  if (production && !process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID) {
    throw new Error(
      "Production iOS builds require EXPO_PUBLIC_ADMOB_IOS_BANNER_ID.",
    );
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(googleServicesPlist
        ? { googleServicesFile: googleServicesPlist }
        : {}),
    },
    android: {
      ...config.android,
      ...(googleServicesJson
        ? { googleServicesFile: googleServicesJson }
        : {}),
    },
    plugins: [
      ...(config.plugins || []),
      [
        "react-native-google-mobile-ads",
        {
          iosAppId: iosAdMobAppId,
          androidAppId: androidAdMobAppId,
        },
      ],
    ],
  };
};
