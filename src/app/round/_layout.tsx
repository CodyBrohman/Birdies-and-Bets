import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/theme';
import { useRoundStore } from '@/store';

/** The round: one scrolling scorecard, with game standings and the summary pushed on top. Screen stays awake. */
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface } }}>
      <Stack.Screen name="play" />
      <Stack.Screen name="standings" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="card" />
    </Stack>
  );
}
