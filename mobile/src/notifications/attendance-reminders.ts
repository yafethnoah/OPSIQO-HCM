import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import type { Shift } from "@/types/mobile";

const MANAGED_KIND = "opsiqo_attendance_reminder";
const TIMED_TEST_KIND = "opsiqo_attendance_scheduled_test";
const SETTINGS_KEY = "opsiqo.mobile.attendance.reminder.settings.v3";
const LEGACY_SETTINGS_KEY = "opsiqo.mobile.attendance.reminder.settings.v2";
const HORIZON_DAYS = 14;
const HORIZON_MS = HORIZON_DAYS * 24 * 60 * 60 * 1000;
const DUE_REMINDER_GRACE_MS = 2 * 60 * 1000;
const MAX_EFFECTIVE_SHIFTS = 28;

export type AttendanceAlarmSound =
  | "default"
  | "opsiqo-pulse.wav"
  | "opsiqo-chime.wav"
  | "opsiqo-bell.wav";

export type AttendanceScheduleSource =
  | "published_shift"
  | "regular_schedule"
  | "mixed"
  | "none";

export type AttendanceReminderSettings = {
  clockInEnabled: boolean;
  clockOutEnabled: boolean;
  clockInLeadMinutes: number;
  clockOutLeadMinutes: number;
  clockInSound: AttendanceAlarmSound;
  clockOutSound: AttendanceAlarmSound;
  regularScheduleEnabled: boolean;
  regularWorkDays: number[];
  regularStartLocalTime: string;
  regularEndLocalTime: string;
};

export type AttendanceReminderState = {
  status: "configuring" | "ready" | "denied" | "error";
  scheduled: number;
  message: string;
  source?: AttendanceScheduleSource;
  nextAt?: string;
};

export type AttendanceReminderContext = {
  isClockedIn?: boolean;
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
  { value: 0, label: "At work time" },
  { value: 5, label: "5 min before" },
  { value: 10, label: "10 min before" },
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
] as const;

export const REGULAR_WORKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

export const DEFAULT_ATTENDANCE_REMINDER_SETTINGS: AttendanceReminderSettings = {
  clockInEnabled: true,
  clockOutEnabled: true,
  clockInLeadMinutes: 0,
  clockOutLeadMinutes: 0,
  clockInSound: "default",
  clockOutSound: "default",
  regularScheduleEnabled: false,
  regularWorkDays: [1, 2, 3, 4, 5],
  regularStartLocalTime: "",
  regularEndLocalTime: "",
};

function validSound(value: unknown): value is AttendanceAlarmSound {
  return ATTENDANCE_ALARM_SOUND_OPTIONS.some((option) => option.value === value);
}

function validLead(value: unknown) {
  return ATTENDANCE_ALARM_LEAD_OPTIONS.some(
    (option) => option.value === Number(value),
  );
}

function validLocalTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim())
  );
}

function sanitizeWorkDays(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_ATTENDANCE_REMINDER_SETTINGS.regularWorkDays];
  }

  return [...new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6),
  )].sort((a, b) => a - b);
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
    regularScheduleEnabled:
      typeof row.regularScheduleEnabled === "boolean"
        ? row.regularScheduleEnabled
        : DEFAULT_ATTENDANCE_REMINDER_SETTINGS.regularScheduleEnabled,
    regularWorkDays: sanitizeWorkDays(row.regularWorkDays),
    regularStartLocalTime: validLocalTime(row.regularStartLocalTime)
      ? row.regularStartLocalTime.trim()
      : "",
    regularEndLocalTime: validLocalTime(row.regularEndLocalTime)
      ? row.regularEndLocalTime.trim()
      : "",
  };
}

export async function getAttendanceReminderSettings() {
  const current = await SecureStore.getItemAsync(SETTINGS_KEY);

  if (current) {
    try {
      return sanitizeSettings(JSON.parse(current));
    } catch {
      return DEFAULT_ATTENDANCE_REMINDER_SETTINGS;
    }
  }

  const legacy = await SecureStore.getItemAsync(LEGACY_SETTINGS_KEY);

  if (legacy) {
    try {
      const migrated = sanitizeSettings(JSON.parse(legacy));
      await saveAttendanceReminderSettings(migrated);
      return migrated;
    } catch {
      return DEFAULT_ATTENDANCE_REMINDER_SETTINGS;
    }
  }

  return DEFAULT_ATTENDANCE_REMINDER_SETTINGS;
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

export async function clearAttendanceReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.kind === MANAGED_KIND)
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
  );
}

async function ensureNotificationPermission(
  sound: AttendanceAlarmSound = "default",
) {
  // Android 13 does not surface the notification permission prompt until a
  // notification channel exists. Create the exact attendance channel first.
  if (Platform.OS === "android") {
    await ensureAndroidChannel(sound);
  }

  let permission = await Notifications.getPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }

  return permission;
}

function channelId(sound: AttendanceAlarmSound) {
  return `attendance-reminders-${sound
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()}`;
}

async function ensureAndroidChannel(sound: AttendanceAlarmSound) {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(channelId(sound), {
    name:
      sound === "default"
        ? "Attendance reminders"
        : `Attendance reminders - ${
            ATTENDANCE_ALARM_SOUND_OPTIONS.find((x) => x.value === sound)?.label ||
            "Custom"
          }`,
    importance: Notifications.AndroidImportance.HIGH,
    sound,
    vibrationPattern: [0, 250, 180, 250],
  });
}

function parseLocalTime(value: string) {
  if (!validLocalTime(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

function localDayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateAtLocalTime(base: Date, value: string, nextDay = false) {
  const parsed = parseLocalTime(value);
  if (!parsed) return null;

  const result = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    parsed.hour,
    parsed.minute,
    0,
    0,
  );

  if (nextDay) result.setDate(result.getDate() + 1);
  return result;
}

export function buildRegularScheduleShifts(
  settings: AttendanceReminderSettings,
  now = new Date(),
): Shift[] {
  if (
    !settings.regularScheduleEnabled ||
    settings.regularWorkDays.length === 0 ||
    !validLocalTime(settings.regularStartLocalTime) ||
    !validLocalTime(settings.regularEndLocalTime)
  ) {
    return [];
  }

  const rows: Shift[] = [];

  for (let offset = 0; offset < HORIZON_DAYS; offset += 1) {
    const day = new Date(now);
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() + offset);

    if (!settings.regularWorkDays.includes(day.getDay())) continue;

    const start = dateAtLocalTime(day, settings.regularStartLocalTime);
    const sameDayEnd = dateAtLocalTime(day, settings.regularEndLocalTime);

    if (!start || !sameDayEnd) continue;

    const end =
      sameDayEnd.getTime() <= start.getTime()
        ? dateAtLocalTime(day, settings.regularEndLocalTime, true)
        : sameDayEnd;

    if (!end || end.getTime() <= now.getTime()) continue;

    rows.push({
      id: `regular-${localDayKey(day)}`,
      title: "Regular work schedule",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status: "published",
    });
  }

  return rows;
}

type EffectiveShift = {
  shift: Shift;
  source: "published_shift" | "regular_schedule";
};

function effectiveReminderShifts(
  shifts: Shift[],
  settings: AttendanceReminderSettings,
  now = new Date(),
): EffectiveShift[] {
  const nowMs = now.getTime();

  const published = shifts
    .filter((shift) => {
      if (shift.status?.toLowerCase() !== "published") return false;
      const end = Date.parse(shift.endAt);
      return Number.isFinite(end) && end > nowMs;
    })
    .map((shift) => ({
      shift,
      source: "published_shift" as const,
    }));

  const regular = buildRegularScheduleShifts(settings, now);

  const publishedDays = new Set(
    published.map(({ shift }) => localDayKey(new Date(shift.startAt))),
  );

  const uncoveredRegular = regular
    .filter((shift) => !publishedDays.has(localDayKey(new Date(shift.startAt))))
    .map((shift) => ({
      shift,
      source: "regular_schedule" as const,
    }));

  return [...published, ...uncoveredRegular]
    .sort(
      (a, b) =>
        Date.parse(a.shift.startAt) - Date.parse(b.shift.startAt),
    )
    .slice(0, MAX_EFFECTIVE_SHIFTS);
}

function managedReminderKey(
  shift: Shift,
  action: "clock_in" | "clock_out",
  date: Date,
  sound: AttendanceAlarmSound,
  scheduleSource: "published_shift" | "regular_schedule",
) {
  return [
    shift.id,
    action,
    date.toISOString(),
    sound,
    scheduleSource,
  ].join("|");
}

async function scheduleVerifiedNotification(
  request: Parameters<typeof Notifications.scheduleNotificationAsync>[0],
) {
  const identifier = await Notifications.scheduleNotificationAsync(request);
  const queued = await Notifications.getAllScheduledNotificationsAsync();

  if (!queued.some((item) => item.identifier === identifier)) {
    throw new Error(
      "The operating system did not retain the scheduled attendance alarm. Check notification and exact-alarm settings, then re-arm.",
    );
  }

  return identifier;
}

async function scheduleReminder(
  shift: Shift,
  action: "clock_in" | "clock_out",
  date: Date,
  sound: AttendanceAlarmSound,
  scheduleSource: "published_shift" | "regular_schedule",
  reminderKey: string,
) {
  const clockIn = action === "clock_in";
  await ensureAndroidChannel(sound);

  return scheduleVerifiedNotification({
    content: {
      title: clockIn ? "Time to clock in" : "Time to clock out",
      body: clockIn
        ? `${shift.title || "Your workday"} is ready. Open OPSIQO Pulse to clock in.`
        : `${shift.title || "Your workday"} is scheduled to end. Open OPSIQO Pulse to clock out.`,
      sound,
      priority:
        Platform.OS === "android"
          ? Notifications.AndroidNotificationPriority.MAX
          : undefined,
      interruptionLevel: Platform.OS === "ios" ? "timeSensitive" : undefined,
      data: {
        kind: MANAGED_KIND,
        action,
        shiftId: shift.id,
        scheduleSource,
        alarmAt: date.toISOString(),
        reminderKey,
        route: "/time",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === "android"
        ? { channelId: channelId(sound) }
        : {}),
    },
  });
}

export async function previewAttendanceAlarmSound(sound: AttendanceAlarmSound) {
  const permission = await ensureNotificationPermission(sound);

  if (!permission.granted) {
    return {
      status: "denied" as const,
      message:
        "Notifications are off. Enable them in device Settings to preview alarm sounds.",
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
    message: "Immediate notification test sent.",
  };
}

export async function scheduleTimedAttendanceTest(
  sound: AttendanceAlarmSound,
  delaySeconds = 60,
) {
  const permission = await ensureNotificationPermission(sound);

  if (!permission.granted) {
    return {
      status: "denied" as const,
      message:
        "Notifications are off. Enable them in device Settings before running the timing test.",
    };
  }

  await ensureAndroidChannel(sound);

  const fireAt = new Date(Date.now() + Math.max(15, delaySeconds) * 1000);

  const identifier = await scheduleVerifiedNotification({
    content: {
      title: "OPSIQO scheduled alarm test",
      body:
        "This delayed notification uses the same scheduled trigger path as Clock In and Clock Out reminders.",
      sound,
      priority:
        Platform.OS === "android"
          ? Notifications.AndroidNotificationPriority.MAX
          : undefined,
      interruptionLevel: Platform.OS === "ios" ? "timeSensitive" : undefined,
      data: {
        kind: TIMED_TEST_KIND,
        alarmAt: fireAt.toISOString(),
        route: "/time",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      ...(Platform.OS === "android"
        ? { channelId: channelId(sound) }
        : {}),
    },
  });

  return {
    status: "ready" as const,
    identifier,
    fireAt: fireAt.toISOString(),
    message: `Verified native timing test for ${fireAt.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })}. You can close Pulse; the phone should notify you at that time.`,
  };
}

export async function getAttendanceReminderRuntimeStatus() {
  const permission = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const managed = scheduled
    .filter((request) => request.content.data?.kind === MANAGED_KIND)
    .map((request) => ({
      alarmAt: String(request.content.data?.alarmAt || ""),
      source: String(request.content.data?.scheduleSource || ""),
      action: String(request.content.data?.action || ""),
    }))
    .filter((row) => Number.isFinite(Date.parse(row.alarmAt)))
    .sort((a, b) => Date.parse(a.alarmAt) - Date.parse(b.alarmAt));

  const sources = new Set(managed.map((row) => row.source));

  const source: AttendanceScheduleSource =
    sources.has("published_shift") && sources.has("regular_schedule")
      ? "mixed"
      : sources.has("published_shift")
        ? "published_shift"
        : sources.has("regular_schedule")
          ? "regular_schedule"
          : "none";

  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
    scheduled: managed.length,
    source,
    nextAt: managed[0]?.alarmAt,
    nextAction: managed[0]?.action,
    nextClockInAt: managed.find((row) => row.action === "clock_in")?.alarmAt,
    nextClockOutAt: managed.find((row) => row.action === "clock_out")?.alarmAt,
    lastCheckedAt: new Date().toISOString(),
  };
}

export async function synchronizeAttendanceReminders(
  shifts: Shift[],
  overrideSettings?: AttendanceReminderSettings,
  context: AttendanceReminderContext = {},
) {
  const settings = sanitizeSettings(
    overrideSettings || (await getAttendanceReminderSettings()),
  );

  if (!settings.clockInEnabled && !settings.clockOutEnabled) {
    await clearAttendanceReminders();
    return {
      status: "ready" as const,
      scheduled: 0,
      source: "none" as const,
      nextAt: undefined,
      nextClockInAt: undefined,
      nextClockOutAt: undefined,
      lastSyncedAt: new Date().toISOString(),
      message: "Clock In and Clock Out alarms are turned off.",
    };
  }

  const channelSounds = [
    ...(settings.clockInEnabled ? [settings.clockInSound] : []),
    ...(settings.clockOutEnabled ? [settings.clockOutSound] : []),
  ];
  if (Platform.OS === "android") {
    await Promise.all(
      [...new Set(channelSounds)].map((sound) => ensureAndroidChannel(sound)),
    );
  }

  const permission = await ensureNotificationPermission(
    channelSounds[0] || "default",
  );

  if (!permission.granted) {
    return {
      status: "denied" as const,
      scheduled: 0,
      source: "none" as const,
      nextAt: undefined,
      nextClockInAt: undefined,
      nextClockOutAt: undefined,
      lastSyncedAt: new Date().toISOString(),
      message:
        "Notifications are off. Enable them in Settings to receive Clock In and Clock Out alarms.",
    };
  }

  const now = Date.now();
  const horizon = now + HORIZON_MS;
  const effective = effectiveReminderShifts(shifts, settings, new Date(now));
  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existingManaged = allScheduled.filter(
    (request) => request.content.data?.kind === MANAGED_KIND,
  );
  const existingByKey = new Map(
    existingManaged
      .map((request) => [
        String(request.content.data?.reminderKey || ""),
        request,
      ] as const)
      .filter(([key]) => Boolean(key)),
  );

  if (effective.length === 0) {
    await clearAttendanceReminders();
    const regularNeedsConfiguration =
      settings.regularScheduleEnabled &&
      (
        settings.regularWorkDays.length === 0 ||
        !validLocalTime(settings.regularStartLocalTime) ||
        !validLocalTime(settings.regularEndLocalTime)
      );

    return {
      status: "ready" as const,
      scheduled: 0,
      source: "none" as const,
      nextAt: undefined,
      nextClockInAt: undefined,
      nextClockOutAt: undefined,
      lastSyncedAt: new Date().toISOString(),
      message: regularNeedsConfiguration
        ? "Regular schedule fallback is enabled but needs at least one workday plus valid start and end times."
        : "No published shift or regular work schedule is available, so no automatic Clock In or Clock Out alarm can be scheduled.",
    };
  }

  const desiredKeys = new Set<string>();
  const desiredRows: Array<{
    key: string;
    action: "clock_in" | "clock_out";
    alarmAt: string;
    source: "published_shift" | "regular_schedule";
  }> = [];

  const usedSources = new Set<string>();
  const allowClockIn = context.isClockedIn !== true;
  const allowClockOut = context.isClockedIn !== false;

  async function arm(
    shift: Shift,
    action: "clock_in" | "clock_out",
    alarmAtMs: number,
    sound: AttendanceAlarmSound,
    source: "published_shift" | "regular_schedule",
  ) {
    if (!(alarmAtMs > now && alarmAtMs <= horizon)) return;
    const date = new Date(alarmAtMs);
    const key = managedReminderKey(shift, action, date, sound, source);
    desiredKeys.add(key);
    desiredRows.push({
      key,
      action,
      alarmAt: date.toISOString(),
      source,
    });
    usedSources.add(source);

    // H51.70: preserve an exact already-armed native reminder. This prevents
    // foreground/bootstrap resync from cancelling a valid reminder just before
    // its fire time. H51.69's one-minute timing test used a different kind and
    // therefore did not expose the clear-all race.
    if (!existingByKey.has(key)) {
      await scheduleReminder(shift, action, date, sound, source, key);
    }
  }

  for (const { shift, source } of effective) {
    const start = Date.parse(shift.startAt);
    const end = Date.parse(shift.endAt);

    if (allowClockIn && settings.clockInEnabled && Number.isFinite(start)) {
      await arm(
        shift,
        "clock_in",
        start - settings.clockInLeadMinutes * 60 * 1000,
        settings.clockInSound,
        source,
      );
    }

    if (allowClockOut && settings.clockOutEnabled && Number.isFinite(end)) {
      await arm(
        shift,
        "clock_out",
        end - settings.clockOutLeadMinutes * 60 * 1000,
        settings.clockOutSound,
        source,
      );
    }
  }

  // Cancel only obsolete managed reminders after all valid reminders have been
  // retained/armed. Legacy H51.69 reminders have no reminderKey and are safely
  // replaced by the keyed H51.70 schedule above.
  await Promise.all(
    existingManaged
      .filter((request) => {
        const key = String(request.content.data?.reminderKey || "");
        if (key && desiredKeys.has(key)) return false;

        const action = String(request.content.data?.action || "");
        const alarmAt = String(request.content.data?.alarmAt || "");
        const alarmAtMs = Date.parse(alarmAt);
        const stillRelevant =
          (action === "clock_in" && allowClockIn) ||
          (action === "clock_out" && allowClockOut);
        const recentlyDue =
          Number.isFinite(alarmAtMs) &&
          alarmAtMs <= now &&
          now - alarmAtMs <= DUE_REMINDER_GRACE_MS;

        // If the OS is slightly late delivering an alarm, keep it armed for a
        // short grace period while the employee still has not acted.
        if (stillRelevant && recentlyDue) return false;

        return !key || !desiredKeys.has(key);
      })
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
  );

  desiredRows.sort((a,b)=>a.alarmAt.localeCompare(b.alarmAt));
  const nextClockInAt = desiredRows.find((row)=>row.action==="clock_in")?.alarmAt;
  const nextClockOutAt = desiredRows.find((row)=>row.action==="clock_out")?.alarmAt;
  const nextAt = desiredRows[0]?.alarmAt;

  const source: AttendanceScheduleSource =
    usedSources.has("published_shift") &&
    usedSources.has("regular_schedule")
      ? "mixed"
      : usedSources.has("published_shift")
        ? "published_shift"
        : usedSources.has("regular_schedule")
          ? "regular_schedule"
          : "none";

  return {
    status: "ready" as const,
    scheduled: desiredRows.length,
    source,
    nextAt,
    nextClockInAt,
    nextClockOutAt,
    lastSyncedAt: new Date().toISOString(),
    message:
      desiredRows.length > 0
        ? `${desiredRows.length} attendance alarm${desiredRows.length === 1 ? "" : "s"} armed on this device.`
        : context.isClockedIn
          ? "You are clocked in, but no future Clock Out alarm is available for the current published or regular schedule."
          : "No future Clock In alarm is currently due for the published or regular schedule.",
  };
}

export function useAttendanceReminders(
  shifts: Shift[],
  context: AttendanceReminderContext = {},
  enabled = true,
) {
  const signature = useMemo(
    () =>
      [
        context.isClockedIn === undefined
          ? "unknown"
          : context.isClockedIn
            ? "clocked-in"
            : "clocked-out",
        ...shifts.map(
          (shift) =>
            `${shift.id}|${shift.startAt}|${shift.endAt}|${shift.status}`,
        ),
      ].join("::"),
    [shifts, context.isClockedIn],
  );

  const [state, setState] = useState<AttendanceReminderState>({
    status: "configuring",
    scheduled: 0,
    message: "Preparing Clock In and Clock Out alarms...",
  });

  const resync = useCallback(async () => {
    if (!enabled) {
      setState({
        status: "configuring",
        scheduled: 0,
        source: "none",
        message: "Waiting for your OPSIQO work schedule...",
      });
      return;
    }

    setState((current) => ({
      ...current,
      status: "configuring",
      message: "Preparing Clock In and Clock Out alarms...",
    }));

    try {
      const next = await synchronizeAttendanceReminders(
        shifts,
        undefined,
        context,
      );
      setState(next);
    } catch {
      setState({
        status: "error",
        scheduled: 0,
        source: "none",
        message:
          "Clock alarms could not be scheduled. Pull to refresh or check notification settings.",
      });
    }
  }, [signature, enabled]);

  useEffect(() => {
    void resync();
  }, [resync]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void resync();
      }
    });

    return () => subscription.remove();
  }, [enabled, resync]);

  return {
    ...state,
    resync,
  };
}
