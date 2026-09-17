import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "@/theme/tokens";

type Props = {
  activeStartAt?: string | undefined;
  onBreak: boolean;
  compact?: boolean;
};

function formatLiveTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatClockedInAt(startAt: string | undefined) {
  if (!startAt) return "";

  const date = new Date(startAt);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function elapsedHms(startAt: string | undefined, nowMs: number) {
  if (!startAt) return "";

  const startMs = new Date(startAt).getTime();
  if (!Number.isFinite(startMs)) return "";

  const totalSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

export function LivePulseClock({
  activeStartAt,
  onBreak,
  compact = false,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reduceMotion, setReduceMotion] = useState(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const secondMotion = useRef(
    new Animated.Value(new Date().getSeconds()),
  ).current;
  const previousSecond = useRef(new Date().getSeconds());

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        // Reduced-motion discovery is best-effort; the live time still updates.
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const delay = Math.max(120, 1000 - (Date.now() % 1000) + 12);
      timer = setTimeout(tick, delay);
    };

    const tick = () => {
      const timestamp = Date.now();
      const second = new Date(timestamp).getSeconds();
      const wrapsMinute = second === 0 && previousSecond.current >= 58;

      setNowMs(timestamp);

      if (reduceMotion) {
        secondMotion.setValue(second);
      } else {
        pulse.stopAnimation();
        pulse.setValue(0);

        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();

        Animated.timing(secondMotion, {
          toValue: wrapsMinute ? 60 : second,
          duration: 230,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && wrapsMinute) {
            secondMotion.setValue(0);
          }
        });
      }

      previousSecond.current = second;
      schedule();
    };

    tick();

    return () => {
      if (timer) clearTimeout(timer);
      pulse.stopAnimation();
      secondMotion.stopAnimation();
    };
  }, [pulse, reduceMotion, secondMotion]);

  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const faceSize = compact ? 108 : 142;
  const handSpan = compact ? 70 : 94;

  const secondRotation = secondMotion.interpolate({
    inputRange: [0, 60],
    outputRange: ["0deg", "360deg"],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.42],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.11],
  });

  const minuteDegrees = now.getMinutes() * 6 + now.getSeconds() * 0.1;
  const hourDegrees = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
  const elapsed = elapsedHms(activeStartAt, nowMs);
  const clockedInAt = formatClockedInAt(activeStartAt);

  return (
    <View
      style={[s.root, compact && s.rootCompact]}
      accessibilityRole="timer"
      accessibilityLabel={`Live time ${formatLiveTime(now)}`}
    >
      <View
        style={[
          s.clockStage,
          { width: faceSize + 20, height: faceSize + 20 },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            s.pulseRing,
            {
              width: faceSize,
              height: faceSize,
              borderRadius: faceSize / 2,
              opacity: reduceMotion ? 0 : pulseOpacity,
              transform: [{ scale: reduceMotion ? 1 : pulseScale }],
            },
          ]}
        />

        <View
          style={[
            s.face,
            {
              width: faceSize,
              height: faceSize,
              borderRadius: faceSize / 2,
            },
          ]}
        >
          <View style={[s.tick, s.tick12]} />
          <View style={[s.tick, s.tick3]} />
          <View style={[s.tick, s.tick6]} />
          <View style={[s.tick, s.tick9]} />

          <View
            style={[
              s.minutePivot,
              {
                height: handSpan * 0.78,
                top: (faceSize - handSpan * 0.78) / 2,
                left: faceSize / 2 - 1.5,
                transform: [{ rotate: `${minuteDegrees}deg` }],
              },
            ]}
          >
            <View
              style={[
                s.minuteHand,
                { height: handSpan * 0.39 - 4 },
              ]}
            />
          </View>

          <View
            style={[
              s.hourPivot,
              {
                height: handSpan * 0.58,
                top: (faceSize - handSpan * 0.58) / 2,
                left: faceSize / 2 - 2,
                transform: [{ rotate: `${hourDegrees}deg` }],
              },
            ]}
          >
            <View
              style={[
                s.hourHand,
                { height: handSpan * 0.29 - 4 },
              ]}
            />
          </View>

          <Animated.View
            style={[
              s.secondPivot,
              {
                height: handSpan,
                top: (faceSize - handSpan) / 2,
                left: faceSize / 2 - 1,
                transform: [{ rotate: secondRotation }],
              },
            ]}
          >
            <View
              style={[
                s.secondHand,
                { height: handSpan / 2 - 5 },
              ]}
            />
          </Animated.View>

          <View style={s.centerDot} />
        </View>
      </View>

      <View style={s.readout}>
        <View style={s.liveRow}>
          <View style={s.liveDot} />
          <Text style={s.liveLabel}>LIVE DEVICE TIME</Text>
        </View>

        <Text
          style={[s.time, compact && s.timeCompact]}
          maxFontSizeMultiplier={1.25}
        >
          {formatLiveTime(now)}
        </Text>

        <Text style={s.date}>{formatDate(now)}</Text>

        {activeStartAt ? (
          <View style={s.session}>
            <Text style={s.sessionLabel}>
              {onBreak ? "ON BREAK Â· " : "CLOCKED IN Â· "}
              {clockedInAt}
            </Text>
            <Text style={s.elapsed}>{elapsed}</Text>
            <Text style={s.elapsedCaption}>WORK ELAPSED</Text>
          </View>
        ) : (
          <View style={s.ready}>
            <Text style={s.readyText}>READY TO CLOCK IN</Text>
          </View>
        )}

        {!compact ? (
          <Text style={s.authority}>
            Live display uses device time. OPSIQO server time remains authoritative
            for attendance records.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "#D6EDF3",
    borderRadius: 18,
    backgroundColor: "#F4FBFD",
    padding: 14,
  },
  rootCompact: {
    gap: 12,
    padding: 12,
  },
  clockStage: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: "#D9F7F7",
  },
  face: {
    overflow: "hidden",
    borderWidth: 3,
    borderColor: colors.navy,
    backgroundColor: colors.surface,
    shadowColor: colors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  tick: {
    position: "absolute",
    backgroundColor: colors.navy,
    borderRadius: 999,
  },
  tick12: {
    width: 3,
    height: 10,
    top: 7,
    left: "50%",
    marginLeft: -1.5,
  },
  tick3: {
    width: 10,
    height: 3,
    right: 7,
    top: "50%",
    marginTop: -1.5,
  },
  tick6: {
    width: 3,
    height: 10,
    bottom: 7,
    left: "50%",
    marginLeft: -1.5,
  },
  tick9: {
    width: 10,
    height: 3,
    left: 7,
    top: "50%",
    marginTop: -1.5,
  },
  minutePivot: {
    position: "absolute",
    width: 3,
    alignItems: "center",
  },
  minuteHand: {
    width: 3,
    borderRadius: 999,
    backgroundColor: colors.navy,
  },
  hourPivot: {
    position: "absolute",
    width: 4,
    alignItems: "center",
  },
  hourHand: {
    width: 4,
    borderRadius: 999,
    backgroundColor: "#344B6C",
  },
  secondPivot: {
    position: "absolute",
    width: 2,
    alignItems: "center",
  },
  secondHand: {
    width: 2,
    borderRadius: 999,
    backgroundColor: colors.teal,
  },
  centerDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    left: "50%",
    top: "50%",
    marginLeft: -5,
    marginTop: -5,
    backgroundColor: colors.teal,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  readout: {
    flex: 1,
    minWidth: 0,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.teal,
  },
  time: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.7,
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  timeCompact: {
    fontSize: 25,
    lineHeight: 30,
  },
  date: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  session: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#D6EDF3",
  },
  sessionLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: colors.success,
  },
  elapsed: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  elapsedCaption: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.muted,
  },
  ready: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#E8F8F8",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  readyText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: colors.teal,
  },
  authority: {
    marginTop: 7,
    fontSize: 9,
    lineHeight: 13,
    color: colors.muted,
  },
});