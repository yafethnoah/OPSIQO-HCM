import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/provider";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { AttendanceHero } from "@/components/attendance-hero";
import { OpsiqoBannerAd } from "@/components/ad-banner";
import { useAttendanceReminders } from "@/notifications/attendance-reminders";
import { Card, H1, H2, Loading, Muted, Screen } from "@/components/ui";
import { colors } from "@/theme/tokens";

const fmt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export default function Home() {
  const { activeOrgId } = useAuth();
  const { data, loading, error, reload } = useBootstrap();
  const reminders = useAttendanceReminders(data?.shifts || []);

  if (loading && !data) {
    return (
      <Screen>
        <Loading label="Loading OPSIQO Pulseâ€¦" />
      </Screen>
    );
  }

  const worker = data?.employee?.worker;
  const leaveHours = (data?.leave?.balances || []).reduce(
    (total: number, balance: any) => total + Number(balance.availableHours || 0),
    0,
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void reload()} />
      }
    >
      <View>
        <Text style={s.eyebrow}>OPSIQO PULSE Â· iOS</Text>
        <H1>Hi, {worker?.displayName?.split(" ")[0] || "there"}</H1>
        <Muted>
          {data?.employee?.assignment?.positionTitle || "Employee"}
          {data?.employee?.assignment?.orgUnitName
            ? ` Â· ${data.employee.assignment.orgUnitName}`
            : ""}
        </Muted>
      </View>

      {error ? (
        <Card>
          <Text style={s.error}>{error}</Text>
        </Card>
      ) : null}

      <AttendanceHero
        data={data}
        activeOrgId={activeOrgId}
        onReload={reload}
        compact
      />

      <View style={s.metrics}>
        <Metric label="Leave" value={`${leaveHours.toFixed(1)}h`} />
        <Metric label="Shifts" value={String(data?.shifts?.length || 0)} />
        <Metric
          label="Inbox"
          value={String(
            (data?.notifications || []).filter((n) => n.status !== "read").length,
          )}
        />
      </View>

      <Card>
        <H2>Next shift</H2>
        {data?.shifts?.[0] ? (
          <>
            <Text style={s.big}>{data.shifts[0].title}</Text>
            <Muted>
              {fmt(data.shifts[0].startAt)} â†’{" "}
              {fmt(data.shifts[0].endAt)}
            </Muted>
          </>
        ) : (
          <Muted>No upcoming published shift is available.</Muted>
        )}
      </Card>

      <Card>
        <H2>Clock reminders</H2>
        <Muted>{reminders.message}</Muted>
        {reminders.status === "denied" ? (
          <Text
            onPress={() => void Linking.openSettings()}
            style={s.quickItem}
          >
            Open notification settings
          </Text>
        ) : null}
      </Card>

      <Card>
        <H2>Quick access</H2>
        <View style={s.quick}>
          <Text onPress={() => router.push("/time")} style={s.quickItem}>
            Time & attendance
          </Text>
          <Text onPress={() => router.push("/documents")} style={s.quickItem}>
            Documents & pay
          </Text>
          <Text onPress={() => router.push("/learning")} style={s.quickItem}>
            Learning
          </Text>
          {data?.capabilities.aiCopilot ? (
            <Text onPress={() => router.push("/copilot")} style={s.quickItem}>
              Ask OPSIQO
            </Text>
          ) : null}
          {data?.capabilities.safety ? (
            <Text onPress={() => router.push("/safety")} style={s.quickItem}>
              Safety report
            </Text>
          ) : null}
          {data?.capabilities.managerMode ? (
            <Text onPress={() => router.push("/team")} style={s.quickItem}>
              My team
            </Text>
          ) : null}
        </View>
      </Card>

      <Card>
        <H2>Needs your attention</H2>
        {data?.attention?.length ? (
          data.attention.slice(0, 5).map((item: any) => (
            <View key={item.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{item.title}</Text>
                <Muted>{item.summary}</Muted>
              </View>
              <Text style={s.severity}>{item.severity}</Text>
            </View>
          ))
        ) : (
          <Muted>You have no urgent employee actions right now.</Muted>
        )}
      </Card>

      <OpsiqoBannerAd />

      <Card>
        <H2>Private by design</H2>
        <Muted>
          OPSIQO Pulse loads only data authorized by your organization membership.
          GPS is requested only when you initiate a governed attendance event.
        </Muted>
      </Card>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 18, gap: 14 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: colors.teal,
  },
  metrics: { flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
  },
  metricLabel: { fontSize: 12, color: colors.muted },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    marginTop: 4,
  },
  big: { fontSize: 20, fontWeight: "800", color: colors.text },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  severity: {
    fontSize: 11,
    textTransform: "uppercase",
    color: colors.warning,
    fontWeight: "800",
  },
  error: { color: colors.danger },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickItem: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.navy,
    fontWeight: "800",
    backgroundColor: "#fff",
  },
});