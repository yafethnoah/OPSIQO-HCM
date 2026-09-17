import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/provider";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { AttendanceHero } from "@/components/attendance-hero";
import { AttendanceAlarmSettings } from "@/components/attendance-alarm-settings";
import { Card, H1, H2, Loading, Muted } from "@/components/ui";
import { colors } from "@/theme/tokens";

export default function Time() {
  const { activeOrgId } = useAuth();
  const { data, loading, error, reload } = useBootstrap();

  if (loading && !data) {
    return (
      <View style={s.loading}>
        <Loading label="Loading attendance..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.content}
    >
      <H1>Time & attendance</H1>
      <Muted>
        Server time, organization policy, geofence rules, duplicate protection and
        audit evidence remain authoritative.
      </Muted>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <AttendanceHero
        data={data}
        activeOrgId={activeOrgId}
        onReload={reload}
      />

      <Card>
        <H2>Upcoming shifts</H2>
        {data?.shifts?.length ? (
          data.shifts.slice(0, 8).map((shift) => (
            <View key={shift.id} style={s.shift}>
              <Text style={s.shiftTitle}>{shift.title}</Text>
              <Muted>
                {new Date(shift.startAt).toLocaleString()} →{" "}
                {new Date(shift.endAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Muted>
            </View>
          ))
        ) : (
          <Muted>No scheduled shifts found.</Muted>
        )}
      </Card>

      <AttendanceAlarmSettings shifts={data?.shifts || []} />

      <Card>
        <H2>Attendance privacy</H2>
        <Muted>
          OPSIQO Pulse requests foreground location only when you submit Clock In
          or Clock Out. Background location tracking is disabled in the iOS app.
        </Muted>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 18, gap: 14 },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
  },
  shift: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  shiftTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontWeight: "600",
  },
});