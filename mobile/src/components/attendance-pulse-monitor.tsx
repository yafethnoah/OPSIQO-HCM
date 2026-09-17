import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

const STRIP_WIDTH = 560;
const STRIP_HEIGHT = 76;
const PULSE_PATH =
  "M0 38 L48 38 L66 38 L80 12 L96 62 L116 26 L136 38 L176 38 L196 38 L214 20 L228 54 L248 24 L264 38 L318 38 L338 38 L356 16 L372 64 L392 26 L410 38 L458 38 L478 38 L494 20 L508 58 L528 30 L546 38 L560 38";

const AnimatedView = Animated.createAnimatedComponent(View);

export function AttendancePulseMonitor() {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -STRIP_WIDTH,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [translateX]);

  return (
    <View style={styles.shell} accessibilityLabel="Heart pulse monitor graphic">
      <Text style={styles.eyebrow}>LIVE PULSE</Text>
      <View style={styles.monitor}>
        <Svg width="100%" height={STRIP_HEIGHT} viewBox={`0 0 ${STRIP_WIDTH} ${STRIP_HEIGHT}`}>
          <Defs>
            <LinearGradient id="gridFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#DFF7F6" />
              <Stop offset="1" stopColor="#F5FCFC" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={STRIP_WIDTH} height={STRIP_HEIGHT} rx="16" fill="url(#gridFade)" />
          {Array.from({ length: 8 }).map((_, index) => (
            <Path key={`grid-${index}`} d={`M${index * 80} 0 V ${STRIP_HEIGHT}`} stroke="#D7ECEB" strokeWidth="1" opacity="0.55" />
          ))}
          {Array.from({ length: 4 }).map((_, index) => (
            <Path key={`row-${index}`} d={`M0 ${12 + index * 16} H ${STRIP_WIDTH}`} stroke="#D7ECEB" strokeWidth="1" opacity="0.45" />
          ))}
        </Svg>
        <View style={styles.viewport}>
          <AnimatedView style={[styles.track, { width: STRIP_WIDTH * 2, transform: [{ translateX }] }]}>
            {[0, 1].map((copy) => (
              <Svg key={`pulse-${copy}`} width={STRIP_WIDTH} height={STRIP_HEIGHT} viewBox={`0 0 ${STRIP_WIDTH} ${STRIP_HEIGHT}`}>
                <Defs>
                  <LinearGradient id={`pulseGradient-${copy}`} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#1F3A5F" />
                    <Stop offset="0.45" stopColor="#1ABCBC" />
                    <Stop offset="1" stopColor="#1F3A5F" />
                  </LinearGradient>
                </Defs>
                <Path
                  d={PULSE_PATH}
                  stroke="#1ABCBC"
                  strokeWidth="9"
                  opacity="0.10"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d={PULSE_PATH}
                  stroke={`url(#pulseGradient-${copy})`}
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ))}
          </AnimatedView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { marginTop: 12, marginBottom: 12 },
  eyebrow: { color: "#1ABCBC", fontSize: 12, fontWeight: "800", letterSpacing: 2.1, marginBottom: 8, marginLeft: 2 },
  monitor: { backgroundColor: "#F5FCFC", borderWidth: 1, borderColor: "#D6ECEB", borderRadius: 18, overflow: "hidden", position: "relative", minHeight: STRIP_HEIGHT, justifyContent: "center" },
  viewport: { position: "absolute", inset: 0, overflow: "hidden", justifyContent: "center" },
  track: { flexDirection: "row", alignItems: "center", height: STRIP_HEIGHT },
});
