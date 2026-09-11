import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { apiFetch, isApiTransportError } from "@/api/client";
import { deviceVerification } from "@/mobile/device";
import {
  listOfflineClockEvents,
  queueOfflineClockEvent,
  syncOfflineClockEvents,
} from "@/mobile/offline-attendance";
import type { MobileBootstrap } from "@/types/mobile";
import { Button, Card, H2, Muted } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { LivePulseClock } from "@/components/live-pulse-clock";

type Props = {
  data: MobileBootstrap | null;
  activeOrgId: string | null;
  onReload: () => Promise<void> | void;
  compact?: boolean;
};

function uuid() {
  const cryptoApi = (globalThis as any).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 3) | 8;
    return v.toString(16);
  });
}

function elapsedLabel(startAt: string | undefined, nowMs: number) {
  if (!startAt) return "";
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start)) return "";
  const totalMinutes = Math.max(0, Math.floor((nowMs - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m elapsed`;
}

export function AttendanceHero({
  data,
  activeOrgId,
  onReload,
  compact = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingOffline, setPendingOffline] = useState(0);
  const [syncHealth, setSyncHealth] = useState<"synced" | "pending" | "attention">("synced");
  const [nowMs, setNowMs] = useState(Date.now());

  const active = useMemo(
    () => [...(data?.attendance?.working || []), ...(data?.attendance?.onBreak || [])][0],
    [data],
  );
  const onBreak = Boolean((data?.attendance?.onBreak || []).length);
  const canClock = Boolean(data?.capabilities.clock);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeOrgId) {
      setPendingOffline(0);
      return;
    }
    void listOfflineClockEvents().then((rows) => {
      const count = rows.filter((x) => x.orgId === activeOrgId).length;
      setPendingOffline(count);
      setSyncHealth(count ? "pending" : "synced");
    });
  }, [activeOrgId]);

  async function collectAttendanceEvidence() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      throw new Error(
        "Location permission is required for this governed attendance action. OPSIQO Pulse does not track location in the background.",
      );
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const verification = await deviceVerification();

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracyMeters: location.coords.accuracy ?? undefined,
      capturedAt: new Date(location.timestamp).toISOString(),
      source: "native" as const,
      deviceVerification: verification.verified
        ? ("native_biometric" as const)
        : ("none" as const),
      integritySignals:
        verification.capable && !verification.verified
          ? ["biometric_not_verified"]
          : [],
    };
  }

  async function clock(action: "clock_in" | "clock_out") {
    if (!activeOrgId || !canClock) return;

    setBusy(true);
    setMessage("");

    try {
      const nativeLocation = await collectAttendanceEvidence();
      const capturedAt = new Date().toISOString();
      const eventId = uuid();

      try {
        await apiFetch(`/api/organizations/${activeOrgId}/time/clock`, {
          method: "POST",
          orgId: activeOrgId,
          body: JSON.stringify({
            action,
            location: nativeLocation,

          }),
        });

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSyncHealth("synced");
        setMessage(
          action === "clock_in"
            ? "Clocked in successfully."
            : "Clocked out successfully.",
        );
        await onReload();
      } catch (error) {
        if (!isApiTransportError(error)) {
          setSyncHealth("attention");
          throw error;
        }

        await queueOfflineClockEvent({
          id: eventId,
          orgId: activeOrgId,
          action,
          capturedAt,
          queuedAt: new Date().toISOString(),
          location: { ...nativeLocation, source: "offline_sync" },
        });

        const pending = await listOfflineClockEvents();
        setPendingOffline(pending.filter((x) => x.orgId === activeOrgId).length);
        setSyncHealth("pending");
        setMessage(
          "No network connection. The attendance event is encrypted on this device and is pending governed synchronization.",
        );
      }
    } catch (error) {
      setSyncHealth("attention");
      setMessage(
        error instanceof Error ? error.message : "Attendance action failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function synchronize() {
    if (!activeOrgId) return;

    setBusy(true);
    setMessage("");

    try {
      const result = await syncOfflineClockEvents(activeOrgId);
      setPendingOffline(result.remaining);
      setSyncHealth(
        result.failures.length ? "attention" : result.remaining ? "pending" : "synced",
      );

      if (result.failures.length) {
        setMessage(
          `${result.synced} offline event(s) synchronized. ${result.failures[0]!.message}`,
        );
      } else {
        setMessage(
          `${result.synced} offline attendance event(s) synchronized successfully.`,
        );
      }

      await onReload();
    } catch (error) {
      setSyncHealth("attention");
      setMessage(
        error instanceof Error
          ? error.message
          : "Offline synchronization failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function breakAction(action: "start" | "end") {
    if (!activeOrgId) return;

    setBusy(true);
    setMessage("");

    try {
      await apiFetch(`/api/organizations/${activeOrgId}/time/breaks`, {
        method: "POST",
        orgId: activeOrgId,
        body: JSON.stringify({ action, paid: false }),
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMessage(action === "start" ? "Break started." : "Break ended.");
      await onReload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Break action failed.");
    } finally {
      setBusy(false);
    }
  }

  const status = active
    ? onBreak
      ? "ON BREAK"
      : "WORKING"
    : "NOT CLOCKED IN";

  const statusDetail = active
    ? `${new Date(active.startAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })} · ${elapsedLabel(active.startAt, nowMs)}`
    : "Ready for your next work period.";

  const successful =
    /success|started|ended|encrypted|synchronized successfully/i.test(message);

  return (
    <Card style={s.hero}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>ATTENDANCE</Text>
          <Text style={[s.status, onBreak && s.breakStatus]}>{status}</Text>
          <Muted>{statusDetail}</Muted>
        </View>
        <View style={s.liveBadge}>
          <Text style={s.liveBadgeText}>{pendingOffline ? "PENDING" : syncHealth === "attention" ? "NEEDS ATTENTION" : "SYNCED"}</Text>
        </View>
      </View>

      <LivePulseClock
        activeStartAt={active?.startAt}
        onBreak={onBreak}
        compact={compact}
      />
      {canClock ? (
        <>
          <Button
            title={busy ? "Please wait..." : active ? "Clock out" : "Clock in"}
            onPress={() => void clock(active ? "clock_out" : "clock_in")}
            disabled={busy}
          />
          {active ? (
            <Button
              title={onBreak ? "End break" : "Start break"}
              onPress={() => void breakAction(onBreak ? "end" : "start")}
              disabled={busy}
              secondary
            />
          ) : null}
        </>
      ) : (
        <Muted>Clock actions are not enabled for this membership.</Muted>
      )}

      {pendingOffline ? (
        <View style={s.offline}>
          <Text style={s.offlineTitle}>
            {pendingOffline} attendance event(s) pending synchronization
          </Text>
          <Muted>
            Server policy, duplicate controls and audit evidence remain authoritative.
          </Muted>
          <Button
            title={busy ? "Synchronizing..." : "Synchronize now"}
            onPress={() => void synchronize()}
            disabled={busy}
            secondary
          />
        </View>
      ) : null}

      {message ? (
        <Text style={successful ? s.success : s.error}>{message}</Text>
      ) : null}

      {!compact ? (
        <Muted>
          Location is requested only when you submit Clock In or Clock Out.
          Background location tracking remains disabled.
        </Muted>
      ) : (
        <Text style={s.privacy}>Location only at attendance action · no background tracking</Text>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  hero: {
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "900",
    color: colors.teal,
    marginBottom: 5,
  },
  status: {
    fontSize: 25,
    fontWeight: "900",
    color: colors.navy,
  },
  breakStatus: {
    color: colors.warning,
  },
  liveBadge: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.muted,
    letterSpacing: 0.6,
  },
  offline: {
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.warning,
  },
  privacy: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    textAlign: "center",
  },
  success: {
    color: colors.success,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    fontWeight: "600",
  },
});