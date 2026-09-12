import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import type { Shift } from "@/types/mobile";

const MANAGED_KIND = "opsiqo_attendance_reminder";
const SETTINGS_KEY = "opsiqo.mobile.attendance.reminder.settings.v2";
const HORIZON_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_SHIFTS = 14;

export type AttendanceAlarmSound =
  | "default"
  | "opsiqo-pulse.wav"
  | "opsiqo-chime.wav"
  | "opsiqo-bell.wav";

export type AttendanceReminderSettings = {
  clockInEnabled: boolean;
  clockOutEnabled: boolean;
  clockInLeadMinutes: number;
  clockOutLeadMinutes: number;
  clockInSound: AttendanceAlarmSound;
  clockOutSound: AttendanceAlarmSound;
};

export const ATTENDANCE_ALARM_SOUND_OPTIONS: Array<{
  value: AttendanceAlarmSound;
  label: string;
}> = [
  { value: "default", label: "Default" },
  { value: "opsiqo-pulse.wav", label: "Pulse" },
  { value: "opsiqo-chime.wav", label: "Chime" },
  { value: "opsiqo-bell.wav", label: "Bell" },
];

export const ATTENDANCE_ALARM_LEAD_OPTIONS = [
  { value: 0, label: "At shift time" },
  { value: 5, label: "5 min before" },
  { value: 10, label: "10 min before" },
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
] as const;

export const DEFAULT_ATTENDANCE_REMINDER_SETTINGS: AttendanceReminderSettings = {
  clockInEnabled: true,
  clockOutEnabled: true,
  clockInLeadMinutes: 0,
  clockOutLeadMinutes: 0,
  clockInSound: "default",
  clockOutSound: "default",
};

export type AttendanceReminderState = {
  status: "configuring" | "ready" | "denied" | "error";
  scheduled: number;
  message: string;
};

function validSound(value: unknown): value is AttendanceAlarmSound {
  return ATTENDANCE_ALARM_SOUND_OPTIONS.some((option) => option.value === value);
}

function validLead(value: unknown) {
  return ATTENDANCE_ALARM_LEAD_OPTIONS.some((option) => option.value === Number(value));
}

function sanitizeSettings(value: unknown): AttendanceReminderSettings {
  const row =
    value && typeof value === "object"
      ? (value as Partial<AttendanceReminderSettings>)
      : {};

  return {
    clockInEnabled:
      typeof row.clockInEnabled === "boolean"
        ? row.clockInEnabled
        : DEFAULT_ATTENDANCE_REMINDER_SETTINGS.clockInEnabled,
    clockOutEnabled:
      typeof row.clockOutEnabled === "boolean"
        ? row.clockOutEnabled
        : DEFAULT_ATTENDANCE_REMINDER_SETTINGS.clockOutEnabled,
    clockInLeadMinutes: validLead(row.clockInLeadMinutes)
      ? Number(row.clockInLeadMinutes)
      : DEFAULT_ATTENDANCE_REMINDER_SETTINGS.clockInLeadMinutes,
    clockOutLeadMinutes: validLead(row.clockOutLeadMinutes)
      ? Number(row.clockOutLeadMinutes)
      : DEFAULT_ATTENDANCE_REMINDER_SETTINGS.clockOutLeadMinutes,
    clockInSound: validSound(row.clockInSound)
      ? row.clockInSound
      : DEFAULT_ATTENDANCE_REMINDER_SETTINGS.clockInSound,
    clockOutSound: validSound(row.clockOutSound)
      ? row.clockOutSound
      : DEFAULT_ATTENDANCE_REMINDER_SETTINGS.clockOutSound,
  };
}

export async function getAttendanceReminderSettings() {
  const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
  if (!raw) return DEFAULT_ATTENDANCE_REMINDER_SETTINGS;

  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_ATTENDANCE_REMINDER_SETTINGS;
  }
}

export async function saveAttendanceReminderSettings(
  settings: AttendanceReminderSettings,
) {
  const sanitized = sanitizeSettings(settings);
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(sanitized), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return sanitized;
}

async function clearManagedReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.kind === MANAGED_KIND)
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

function channelId(sound: AttendanceAlarmSound) {
  return `attendance-reminders-${sound.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

async function ensureAndroidChannel(sound: AttendanceAlarmSound) {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(channelId(sound), {
    name:
      sound === "default"
        ? "Attendance reminders"
        : `Attendance reminders · ${ATTENDANCE_ALARM_SOUND_OPTIONS.find((x) => x.value === sound)?.label || "Custom"}`,
    importance: Notifications.AndroidImportance.HIGH,
    sound,
    vibrationPattern: [0, 250, 180, 250],
  });
}

async function scheduleReminder(
  shift: Shift,
  action: "clock_in" | "clock_out",
  date: Date,
  sound: AttendanceAlarmSound,
) {
  const clockIn = action === "clock_in";
  await ensureAndroidChannel(sound);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: clockIn ? "Time to clock in" : "Time to clock out",
      body: clockIn
        ? `${shift.title || "Your shift"} is ready. Open OPSIQO Pulse to clock in.`
        : `${shift.title || "Your shift"} is scheduled to end. Open OPSIQO Pulse to clock out.`,
      sound,
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
      ...(Platform.OS === "android" ? { channelId: channelId(sound) } : {}),
    },
  });
}

export async function previewAttendanceAlarmSound(sound: AttendanceAlarmSound) {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    return {
      status: "denied" as const,
      message: "Notifications are off. Enable them in device Settings to preview alarm sounds.",
    };
  }

  await ensureAndroidChannel(sound);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "OPSIQO alarm preview",
      body: "This is the selected attendance reminder sound.",
      sound,
      data: { kind: "opsiqo_attendance_alarm_preview" },
    },
    trigger:
      Platform.OS === "android"
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: channelId(sound),
          }
        : null,
  });

  return {
    status: "ready" as const,
    message: "Alarm preview scheduled.",
  };
}

export async function synchronizeAttendanceReminders(
  shifts: Shift[],
  overrideSettings?: AttendanceReminderSettings,
) {
  await clearManagedReminders();

  const settings = sanitizeSettings(
    overrideSettings || (await getAttendanceReminderSettings()),
  );

  if (!settings.clockInEnabled && !settings.clockOutEnabled) {
    return {
      status: "ready" as const,
      scheduled: 0,
      message: "Clock-in and clock-out alarms are turned off.",
    };
  }

  const granted = await ensureNotificationPermission();

  if (!granted) {
    return {
      status: "denied" as const,
      scheduled: 0,
      message:
        "Notifications are off. Enable them in Settings to receive clock-in and clock-out alarms.",
    };
  }

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

    if (settings.clockInEnabled && Number.isFinite(start)) {
      const alarmAt = start - settings.clockInLeadMinutes * 60 * 1000;
      if (alarmAt > now && alarmAt <= horizon) {
        await scheduleReminder(
          shift,
          "clock_in",
          new Date(alarmAt),
          settings.clockInSound,
        );
        scheduled += 1;
      }
    }

    if (settings.clockOutEnabled && Number.isFinite(end)) {
      const alarmAt = end - settings.clockOutLeadMinutes * 60 * 1000;
      if (alarmAt > now && alarmAt <= horizon) {
        await scheduleReminder(
          shift,
          "clock_out",
          new Date(alarmAt),
          settings.clockOutSound,
        );
        scheduled += 1;
      }
    }
  }

  return {
    status: "ready" as const,
    scheduled,
    message:
      scheduled > 0
        ? `${scheduled} attendance alarm${scheduled === 1 ? "" : "s"} scheduled for your upcoming shifts.`
        : "No upcoming enabled attendance alarms need to be scheduled right now.",
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
    message: "Preparing clock-in and clock-out alarms...",
  });

  const resync = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "configuring",
      message: "Preparing clock-in and clock-out alarms...",
    }));

    try {
      const next = await synchronizeAttendanceReminders(shifts);
      setState(next);
    } catch {
      setState({
        status: "error",
        scheduled: 0,
        message:
          "Clock alarms could not be scheduled. Pull to refresh or check notification settings.",
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
