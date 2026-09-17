import { useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
  useForeground,
} from "react-native-google-mobile-ads";

const environment = process.env.EXPO_PUBLIC_OPSIQO_ENVIRONMENT || "development";
const production = environment === "production";

const productionUnitId =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID
    : process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID;

const unitId = production ? productionUnitId : TestIds.ADAPTIVE_BANNER;

export function OpsiqoBannerAd() {
  const bannerRef = useRef<BannerAd>(null);

  useForeground(() => {
    if (Platform.OS === "ios") {
      bannerRef.current?.load();
    }
  });

  if (!unitId) return null;

  return (
    <View style={styles.container} accessibilityLabel="Advertisement">
      <BannerAd
        ref={bannerRef}
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
