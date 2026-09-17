import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { Shift } from "@/types/mobile";
import { Button, Card, H2, Muted } from "@/components/ui";
import { colors } from "@/theme/tokens";
import {
  ATTENDANCE_ALARM_LEAD_OPTIONS,
  ATTENDANCE_ALARM_SOUND_OPTIONS,
  DEFAULT_ATTENDANCE_REMINDER_SETTINGS,
  getAttendanceReminderSettings,
  previewAttendanceAlarmSound,
  saveAttendanceReminderSettings,
  synchronizeAttendanceReminders,
  type AttendanceAlarmSound,
  type AttendanceReminderSettings,
} from "@/notifications/attendance-reminders";

type Props = {
  shifts: Shift[];
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

export function AttendanceAlarmSettings({ shifts }: Props) {
  const [settings, setSettings] = useState<AttendanceReminderSettings>(
    DEFAULT_ATTENDANCE_REMINDER_SETTINGS,
  );
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    void getAttendanceReminderSettings()
      .then((value) => {
        if (mounted) setSettings(value);
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

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const persisted = await saveAttendanceReminderSettings(settings);
      setSettings(persisted);
      const result = await synchronizeAttendanceReminders(shifts, persisted);
      setMessage(result.message);
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

  async function preview(sound: AttendanceAlarmSound) {
    setMessage("");
    try {
      const result = await previewAttendanceAlarmSound(sound);
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Alarm preview could not be played.",
      );
    }
  }

  return (
    <Card>
      <H2>Clock alarms</H2>
      <Muted>
        Choose whether OPSIQO should alert you for Clock In and Clock Out,
        when the alarm should ring, and which sound it should use.
      </Muted>

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

      <Button
        title={saving ? "Saving..." : "Save alarm settings"}
        onPress={() => void save()}
        disabled={!ready || saving}
      />

      {message ? <Text style={s.message}>{message}</Text> : null}

      <Muted>
        Alarm delivery still follows your phone notification, Focus and silent-mode
        settings.
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
  message: {
    color: colors.navy,
    fontWeight: "700",
    lineHeight: 20,
  },
});
