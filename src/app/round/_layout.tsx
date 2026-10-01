import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/theme';
import { useRoundStore } from '@/store';
import { RoundTabBar } from '@/components/RoundTabBar';

/** The round: three peers the user moves between constantly. Hole · Card · Games. Screen stays awake. */
export default function RoundLayout() {
  const { c } = useTheme();
  const router = useRouter();
  const hasRound = useRoundStore((s) => s.round != null);
  useKeepAwake();

  useEffect(() => {
    if (!hasRound) router.replace('/');
  }, [hasRound, router]);

  if (!hasRound) return null;

  return (
    <Tabs
      tabBar={(props) => <RoundTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.surface },
      }}
    >
      <Tabs.Screen name="play" options={{ title: 'Hole' }} />
      <Tabs.Screen name="card" options={{ title: 'Card' }} />
      <Tabs.Screen name="standings" options={{ title: 'Games' }} />
      <Tabs.Screen name="summary" options={{ href: null }} />
    </Tabs>
  );
}
