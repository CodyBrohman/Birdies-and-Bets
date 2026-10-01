import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/** Course editor and the mid-round games editor. Building a round happens on the Bet tab. */
export default function NewRoundLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.surface },
      }}
    >
      <Stack.Screen name="add-course" />
      <Stack.Screen name="games" />
    </Stack>
  );
}
