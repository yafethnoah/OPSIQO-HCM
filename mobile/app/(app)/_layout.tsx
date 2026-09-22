import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { AppState, type ColorValue } from "react-native";
import { useAuth } from "@/auth/provider";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useAttendanceReminders } from "@/notifications/attendance-reminders";
import { registerDevice } from "@/mobile/device";
import {
  PulseTabIcon,
  type PulseTabIconName,
} from "@/components/pulse-tab-icon";
import { colors } from "@/theme/tokens";

type TabIconProps = {
  focused: boolean;
  color: ColorValue;
  size: number;
};

const icon =
  (name: PulseTabIconName) =>
  ({ color, size }: TabIconProps) => (
    <PulseTabIcon name={name} color={String(color)} size={size} />
  );

function AttendanceReminderCoordinator() {
  const { activeOrgId } = useAuth();
  const { data, reload } = useBootstrap();

  const isClockedIn = Boolean(
    (data?.attendance?.working?.length || 0) +
      (data?.attendance?.onBreak?.length || 0),
  );

  useAttendanceReminders(
    data?.shifts || [],
    { isClockedIn },
    Boolean(data),
  );

  useEffect(() => {
    if (!activeOrgId || !data) return;

    let cancelled = false;

    const register = async () => {
      try {
        await registerDevice(activeOrgId, { requestPush: true });
        if (!cancelled) await reload();
      } catch {
        // The Time screen exposes an explicit repair/test action so a
        // registration failure is visible and recoverable by the employee.
      }
    };

    void register();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void register();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [activeOrgId, Boolean(data), reload]);

  return null;
}

export default function AppLayout() {
  const { ready, authenticated, activeOrgId } = useAuth();

  if (!ready) return null;
  if (!authenticated) return <Redirect href="/sign-in" />;
  if (!activeOrgId) return <Redirect href="/select-organization" />;

  return (
    <>
      <AttendanceReminderCoordinator />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.teal,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            height: 72,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{ title: "Home", tabBarIcon: icon("home") }}
        />
        <Tabs.Screen
          name="time"
          options={{ title: "Time", tabBarIcon: icon("time") }}
        />
        <Tabs.Screen
          name="requests"
          options={{ title: "Requests", tabBarIcon: icon("requests") }}
        />
        <Tabs.Screen
          name="inbox"
          options={{ title: "Inbox", tabBarIcon: icon("inbox") }}
        />
        <Tabs.Screen
          name="me"
          options={{ title: "Me", tabBarIcon: icon("me") }}
        />
        <Tabs.Screen name="documents" options={{ href: null }} />
        <Tabs.Screen name="learning" options={{ href: null }} />
        <Tabs.Screen name="copilot" options={{ href: null }} />
        <Tabs.Screen name="safety" options={{ href: null }} />
        <Tabs.Screen name="team" options={{ href: null }} />
      </Tabs>
    </>
  );
}