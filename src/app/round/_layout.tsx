import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/theme';
import { useRoundStore } from '@/store';

/** The round: three peers the user moves between constantly. Play · Card · Games. Screen stays awake. */
export default function RoundLayout() {
  const { c, t } = useTheme();
  const router = useRouter();
  const hasRound = useRoundStore((s) => s.round != null);
  useKeepAwake();

  useEffect(() => {
    if (!hasRound) router.replace('/');
  }, [hasRound, router]);

  if (!hasRound) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: {
          backgroundColor: c.surfaceRaised,
          borderTopColor: c.divider,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontFamily: t.tab.fontFamily, fontSize: t.tab.fontSize },
        sceneStyle: { backgroundColor: c.surface },
      }}
    >
      <Tabs.Screen name="play" options={{ title: 'Play', tabBarIcon: ({ color }) => <Ionicons name="golf-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="card" options={{ title: 'Card', tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} /> }} />
      <Tabs.Screen
        name="standings"
        options={{ title: 'Games', tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen name="summary" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
