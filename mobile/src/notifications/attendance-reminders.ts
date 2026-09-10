import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Shift } from "@/types/mobile";

const MANAGED_KIND = "opsiqo_attendance_reminder";
const CHANNEL_ID = "attendance-reminders";
const HORIZON_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_SHIFTS = 14;

export type AttendanceReminderState = {
  status: "configuring" | "ready" | "denied" | "error";
  scheduled: number;
  message: string;
};

async function clearManagedReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter(
        (request) =>
          request.content.data?.kind === MANAGED_KIND,
      )
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
  );
}

async function ensureNotificationPermission() {
  let permission = await Notifications.getPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }

  return permission.granted;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Clock in and clock out reminders",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 180, 250],
  });
}

async function scheduleReminder(
  shift: Shift,
  action: "clock_in" | "clock_out",
  date: Date,
) {
  const clockIn = action === "clock_in";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: clockIn ? "Time to clock in" : "Time to clock out",
      body: clockIn
        ? `${shift.title || "Your shift"} starts now. Open OPSIQO Pulse to clock in.`
        : `${shift.title || "Your shift"} is scheduled to end now. If you are still working, open OPSIQO Pulse to clock out.`,
      sound: "default",
      data: {
        kind: MANAGED_KIND,
        action,
        shiftId: shift.id,
        route: "/time",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

export async function synchronizeAttendanceReminders(shifts: Shift[]) {
  await clearManagedReminders();

  const granted = await ensureNotificationPermission();

  if (!granted) {
    return {
      status: "denied" as const,
      scheduled: 0,
      message:
        "Notifications are off. Enable them in Settings to receive clock-in and clock-out alerts.",
    };
  }

  await ensureAndroidChannel();

  const now = Date.now();
  const horizon = now + HORIZON_MS;

  const upcoming = shifts
    .filter((shift) => {
      if (shift.status?.toLowerCase() === "cancelled") return false;
      const end = Date.parse(shift.endAt);
      return Number.isFinite(end) && end > now;
    })
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
    .slice(0, MAX_SHIFTS);

  let scheduled = 0;

  for (const shift of upcoming) {
    const start = Date.parse(shift.startAt);
    const end = Date.parse(shift.endAt);

    if (Number.isFinite(start) && start > now && start <= horizon) {
      await scheduleReminder(shift, "clock_in", new Date(start));
      scheduled += 1;
    }

    if (Number.isFinite(end) && end > now && end <= horizon) {
      await scheduleReminder(shift, "clock_out", new Date(end));
      scheduled += 1;
    }
  }

  return {
    status: "ready" as const,
    scheduled,
    message:
      scheduled > 0
        ? `${scheduled} clock reminder${scheduled === 1 ? "" : "s"} scheduled for your upcoming shifts.`
        : "No upcoming shift reminders need to be scheduled right now.",
  };
}

export function useAttendanceReminders(shifts: Shift[]) {
  const signature = useMemo(
    () =>
      shifts
        .map(
          (shift) =>
            `${shift.id}|${shift.startAt}|${shift.endAt}|${shift.status}`,
        )
        .join("::"),
    [shifts],
  );

  const [state, setState] = useState<AttendanceReminderState>({
    status: "configuring",
    scheduled: 0,
    message: "Preparing clock-in and clock-out reminders...",
  });

  const resync = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "configuring",
      message: "Preparing clock-in and clock-out reminders...",
    }));

    try {
      const next = await synchronizeAttendanceReminders(shifts);
      setState(next);
    } catch {
      setState({
        status: "error",
        scheduled: 0,
        message:
          "Clock reminders could not be scheduled. Pull to refresh or check notification settings.",
      });
    }
  }, [signature]);

  useEffect(() => {
    void resync();
  }, [resync]);

  return {
    ...state,
    resync,
  };
}
