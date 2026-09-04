import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useAuth } from '@/auth/provider';
import { colors } from '@/theme/tokens';

type TabIconProps = {
  focused: boolean;
  color: ColorValue;
  size: number;
};

const icon = (label: string) =>
  ({ color, size }: TabIconProps) => (
    <Text
      allowFontScaling={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ color, fontWeight: '800', fontSize: Math.max(14, size - 4), lineHeight: size }}
    >
      {label}
    </Text>
  );

export default function AppLayout() {
  const { ready, authenticated, activeOrgId } = useAuth();
  if (!ready) return null;
  if (!authenticated) return <Redirect href="/sign-in" />;
  if (!activeOrgId) return <Redirect href="/select-organization" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 66, paddingBottom: 8, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="time" options={{ title: 'Time', tabBarIcon: icon('◷') }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests', tabBarIcon: icon('+') }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: icon('●') }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('○') }} />
      <Tabs.Screen name="documents" options={{href:null}} />
      <Tabs.Screen name="learning" options={{href:null}} />
      <Tabs.Screen name="copilot" options={{href:null}} />
      <Tabs.Screen name="safety" options={{href:null}} />
      <Tabs.Screen name="team" options={{href:null}} />
    </Tabs>
  );
}
