import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/theme';
import { useRoundStore } from '@/store';
import { formSheet, stackOptions } from '@/components/TabStack';

/**
 * The round in progress, over the tabs: the scorecard, with standings and the hole note as sheets and the results
 * pushed on top. The screen stays awake. If the round goes away (saved, discarded, restored over), back to Home.
 */
export default function RoundLayout() {
  const { c } = useTheme();
  const router = useRouter();
  const hasRound = useRoundStore((s) => s.round != null);
  useKeepAwake();

  useEffect(() => {
    if (!hasRound) router.dismissTo('/');
  }, [hasRound, router]);

  if (!hasRound) return null;

  return (
    <Stack screenOptions={stackOptions(c)}>
      <Stack.Screen name="play" />
      <Stack.Screen name="standings" options={formSheet([0.6, 1])} />
      <Stack.Screen name="note" options={formSheet([0.5])} />
      <Stack.Screen name="summary" />
      <Stack.Screen name="card" />
    </Stack>
  );
}
