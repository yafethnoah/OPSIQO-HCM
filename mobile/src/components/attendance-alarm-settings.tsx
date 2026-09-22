import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Shift } from "@/types/mobile";
import { Button, Card, H2, Muted } from "@/components/ui";
import { colors } from "@/theme/tokens";
import {
  ATTENDANCE_ALARM_LEAD_OPTIONS,
  ATTENDANCE_ALARM_SOUND_OPTIONS,
  DEFAULT_ATTENDANCE_REMINDER_SETTINGS,
  REGULAR_WORKDAY_OPTIONS,
  getAttendanceReminderRuntimeStatus,
  getAttendanceReminderSettings,
  previewAttendanceAlarmSound,
  saveAttendanceReminderSettings,
  scheduleTimedAttendanceTest,
  synchronizeAttendanceReminders,
  type AttendanceAlarmSound,
  type AttendanceReminderSettings,
  type AttendanceScheduleSource,
} from "@/notifications/attendance-reminders";

type Props = {
  shifts: Shift[];
  isClockedIn?: boolean;
  serverBackupReady?: boolean;
  activePushDevices?: number;
};

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.choice, selected && s.choiceSelected]}
    >
      <Text style={[s.choiceText, selected && s.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AlarmSection({
  title,
  enabled,
  onEnabled,
  leadMinutes,
  onLeadMinutes,
  sound,
  onSound,
  onPreview,
}: {
  title: string;
  enabled: boolean;
  onEnabled: (next: boolean) => void;
  leadMinutes: number;
  onLeadMinutes: (next: number) => void;
  sound: AttendanceAlarmSound;
  onSound: (next: AttendanceAlarmSound) => void;
  onPreview: () => void;
}) {
  return (
    <View style={s.section}>
      <View style={s.switchRow}>
        <View style={s.switchCopy}>
          <Text style={s.sectionTitle}>{title}</Text>
          <Muted>{enabled ? "Alarm enabled" : "Alarm disabled"}</Muted>
        </View>
        <Switch value={enabled} onValueChange={onEnabled} />
      </View>

      <View style={!enabled && s.disabled}>
        <Text style={s.label}>When</Text>
        <View style={s.choices}>
          {ATTENDANCE_ALARM_LEAD_OPTIONS.map((option) => (
            <ChoiceButton
              key={option.value}
              label={option.label}
              selected={leadMinutes === option.value}
              onPress={() => enabled && onLeadMinutes(option.value)}
            />
          ))}
        </View>

        <Text style={s.label}>Ring tone</Text>
        <View style={s.choices}>
          {ATTENDANCE_ALARM_SOUND_OPTIONS.map((option) => (
            <ChoiceButton
              key={option.value}
              label={option.label}
              selected={sound === option.value}
              onPress={() => enabled && onSound(option.value)}
            />
          ))}
        </View>

        <Button
          title="Preview selected sound"
          onPress={onPreview}
          disabled={!enabled}
          secondary
        />
      </View>
    </View>
  );
}

function sourceLabel(source: AttendanceScheduleSource) {
  if (source === "published_shift") return "Published shifts";
  if (source === "regular_schedule") return "Regular schedule fallback";
  if (source === "mixed") return "Published shifts + regular schedule";
  return "No active schedule";
}

function fmtNext(iso?: string) {
  if (!iso) return "None scheduled";

  try {
    return new Date(iso).toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AttendanceAlarmSettings({
  shifts,
  isClockedIn,
  serverBackupReady = false,
  activePushDevices = 0,
}: Props) {
  const [settings, setSettings] = useState<AttendanceReminderSettings>(
    DEFAULT_ATTENDANCE_REMINDER_SETTINGS,
  );
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notificationDenied, setNotificationDenied] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [scheduleSource, setScheduleSource] =
    useState<AttendanceScheduleSource>("none");
  const [nextAt, setNextAt] = useState<string | undefined>();
  const [nextClockInAt, setNextClockInAt] = useState<string | undefined>();
  const [nextClockOutAt, setNextClockOutAt] = useState<string | undefined>();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      getAttendanceReminderSettings(),
      getAttendanceReminderRuntimeStatus(),
    ])
      .then(([value, runtime]) => {
        if (!mounted) return;
        setSettings(value);
        setNotificationDenied(!runtime.granted && !runtime.canAskAgain);
        setScheduledCount(runtime.scheduled);
        setScheduleSource(runtime.source);
        setNextAt(runtime.nextAt);
        setNextClockInAt(runtime.nextClockInAt);
        setNextClockOutAt(runtime.nextClockOutAt);
        setLastSyncedAt(runtime.lastCheckedAt);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function patch(next: Partial<AttendanceReminderSettings>) {
    setSettings((current) => ({ ...current, ...next }));
  }

  function toggleWorkDay(day: number) {
    const selected = settings.regularWorkDays.includes(day);

    patch({
      regularWorkDays: selected
        ? settings.regularWorkDays.filter((value) => value !== day)
        : [...settings.regularWorkDays, day].sort((a, b) => a - b),
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const persisted = await saveAttendanceReminderSettings(settings);
      setSettings(persisted);

      const result = await synchronizeAttendanceReminders(
        shifts,
        persisted,
        { isClockedIn },
      );

      setMessage(result.message);
      setScheduledCount(result.scheduled);
      setScheduleSource(result.source || "none");
      setNextAt(result.nextAt);
      setNextClockInAt(result.nextClockInAt);
      setNextClockOutAt(result.nextClockOutAt);
      setLastSyncedAt(result.lastSyncedAt);
      setNotificationDenied(result.status === "denied");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Attendance alarm settings could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function rearm() {
    setSaving(true);
    setMessage("");
    try {
      const result = await synchronizeAttendanceReminders(
        shifts,
        settings,
        { isClockedIn },
      );
      setMessage(result.message);
      setScheduledCount(result.scheduled);
      setScheduleSource(result.source || "none");
      setNextAt(result.nextAt);
      setNextClockInAt(result.nextClockInAt);
      setNextClockOutAt(result.nextClockOutAt);
      setLastSyncedAt(result.lastSyncedAt);
      setNotificationDenied(result.status === "denied");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Attendance alarms could not be re-armed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function preview(sound: AttendanceAlarmSound) {
    setMessage("");

    try {
      const result = await previewAttendanceAlarmSound(sound);
      setMessage(result.message);
      setNotificationDenied(result.status === "denied");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Alarm preview could not be played.",
      );
    }
  }

  async function openExactAlarmAccess() {
    setMessage("");
    if (Platform.OS !== "android") return;

    try {
      await Linking.sendIntent("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
      setMessage(
        "Android exact-alarm settings opened. Allow Alarms & reminders for OPSIQO Pulse, return here, then tap Re-arm Clock In / Clock Out alarms.",
      );
    } catch {
      await Linking.openSettings();
      setMessage(
        "Open Special app access > Alarms & reminders and allow OPSIQO Pulse, then return and re-arm the alarms.",
      );
    }
  }

  async function timedTest() {
    setMessage("");

    try {
      const result = await scheduleTimedAttendanceTest(
        settings.clockInSound,
        60,
      );

      setMessage(result.message);
      setNotificationDenied(result.status === "denied");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The one-minute timing test could not be scheduled.",
      );
    }
  }

  return (
    <Card>
      <H2>Clock alarms</H2>
      <Muted>
        OPSIQO uses published shifts first. When no shift is published for a
        workday, enable a regular schedule fallback so alarms still fire at your
        normal start and end times.
      </Muted>

      <View style={s.statusBox}>
        <Text style={s.statusTitle}>Automatic reminder status</Text>
        <Text style={s.statusText}>
          Schedule source: {sourceLabel(scheduleSource)}
        </Text>
        <Text style={s.statusText}>
          Scheduled alarms: {scheduledCount}
        </Text>
        <Text style={s.statusText}>
          Next alarm: {fmtNext(nextAt)}
        </Text>
        <Text style={s.statusText}>
          Clock In alarm: {nextClockInAt ? `Armed · ${fmtNext(nextClockInAt)}` : "Not armed"}
        </Text>
        <Text style={s.statusText}>
          Clock Out alarm: {nextClockOutAt ? `Armed · ${fmtNext(nextClockOutAt)}` : "Not armed"}
        </Text>
        <Text style={s.statusText}>
          Last alarm sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "Not synced"}
        </Text>
        <Text style={s.statusText}>
          Published shifts loaded:{" "}
          {shifts.filter((x) => x.status === "published").length}
        </Text>
        <Text style={s.statusText}>
          Local device alarms: {scheduledCount > 0 ? "Scheduled" : "No future alarm"}
        </Text>
        <Text style={s.statusText}>
          Server backup reminder: {serverBackupReady ? "Ready" : "Needs mobile notification registration"}
        </Text>
        <Text style={s.statusText}>
          Push-capable devices: {activePushDevices}
        </Text>
      </View>

      <AlarmSection
        title="Clock In alarm"
        enabled={settings.clockInEnabled}
        onEnabled={(value) => patch({ clockInEnabled: value })}
        leadMinutes={settings.clockInLeadMinutes}
        onLeadMinutes={(value) => patch({ clockInLeadMinutes: value })}
        sound={settings.clockInSound}
        onSound={(value) => patch({ clockInSound: value })}
        onPreview={() => void preview(settings.clockInSound)}
      />

      <AlarmSection
        title="Clock Out alarm"
        enabled={settings.clockOutEnabled}
        onEnabled={(value) => patch({ clockOutEnabled: value })}
        leadMinutes={settings.clockOutLeadMinutes}
        onLeadMinutes={(value) => patch({ clockOutLeadMinutes: value })}
        sound={settings.clockOutSound}
        onSound={(value) => patch({ clockOutSound: value })}
        onPreview={() => void preview(settings.clockOutSound)}
      />

      <View style={s.section}>
        <View style={s.switchRow}>
          <View style={s.switchCopy}>
            <Text style={s.sectionTitle}>Regular schedule fallback</Text>
            <Muted>
              Use these normal work hours only on days without a published shift.
            </Muted>
          </View>
          <Switch
            value={settings.regularScheduleEnabled}
            onValueChange={(value) =>
              patch({ regularScheduleEnabled: value })
            }
          />
        </View>

        <View style={!settings.regularScheduleEnabled && s.disabled}>
          <Text style={s.label}>Workdays</Text>
          <View style={s.choices}>
            {REGULAR_WORKDAY_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={settings.regularWorkDays.includes(option.value)}
                onPress={() =>
                  settings.regularScheduleEnabled &&
                  toggleWorkDay(option.value)
                }
              />
            ))}
          </View>

          <Text style={s.label}>Normal start time</Text>
          <TextInput
            value={settings.regularStartLocalTime}
            onChangeText={(value) =>
              patch({ regularStartLocalTime: value })
            }
            editable={settings.regularScheduleEnabled}
            placeholder="09:00"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            style={s.input}
            maxLength={5}
          />

          <Text style={s.label}>Normal end time</Text>
          <TextInput
            value={settings.regularEndLocalTime}
            onChangeText={(value) =>
              patch({ regularEndLocalTime: value })
            }
            editable={settings.regularScheduleEnabled}
            placeholder="17:00"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            style={s.input}
            maxLength={5}
          />

          <Muted>
            Enter times as 24-hour HH:MM. Regular schedule reminders use the
            phone's current local time zone. A published OPSIQO shift overrides
            the fallback for that day.
          </Muted>
        </View>
      </View>

      <Button
        title={saving ? "Re-arming..." : "Re-arm Clock In / Clock Out alarms"}
        onPress={() => void rearm()}
        disabled={!ready || saving}
        secondary
      />

      <Button
        title="Send test notification now"
        onPress={() => void preview(settings.clockInSound)}
        secondary
      />

      <Button
        title="Schedule 1-minute timing test"
        onPress={() => void timedTest()}
        secondary
      />

      {notificationDenied ? (
        <Button
          title="Open device notification settings"
          onPress={() => void Linking.openSettings()}
          secondary
        />
      ) : null}

      {Platform.OS === "android" ? (
        <>
          <Button
            title="Open Android Alarms & reminders access"
            onPress={() => void openExactAlarmAccess()}
            secondary
          />
          <Muted>
            Android 12+ requires Alarms & reminders special access for exact
            Clock In / Clock Out timing. After granting it, return to Pulse and
            tap Re-arm Clock In / Clock Out alarms.
          </Muted>
        </>
      ) : null}

      <Button
        title={saving ? "Saving..." : "Save & schedule alarms"}
        onPress={() => void save()}
        disabled={!ready || saving}
      />

      {message ? <Text style={s.message}>{message}</Text> : null}

      <Muted>
        The one-minute timing test uses the same delayed notification trigger as
        a real Clock In or Clock Out reminder. Published shifts also receive a
        server-side backup reminder at shift start/end plus a state-aware missed
        Clock In / Clock Out follow-up when the employee still has not acted.
      </Muted>
    </Card>
  );
}

const s = StyleSheet.create({
  section: {
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchCopy: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  choiceSelected: {
    borderColor: colors.teal,
    backgroundColor: "#EAF7FC",
  },
  choiceText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  choiceTextSelected: {
    color: colors.navy,
  },
  disabled: {
    opacity: 0.45,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  statusBox: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: "#F6FAFC",
  },
  statusTitle: {
    color: colors.navy,
    fontWeight: "900",
  },
  statusText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  message: {
    color: colors.navy,
    fontWeight: "700",
    lineHeight: 20,
  },
});
