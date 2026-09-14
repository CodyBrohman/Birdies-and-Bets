import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/** Setup is sequential: Course → Players → Games. A stack with the back gesture. */
export default function NewRoundLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.surface },
      }}
    >
      <Stack.Screen name="course" />
      <Stack.Screen name="add-course" />
      <Stack.Screen name="players" />
      <Stack.Screen name="games" />
    </Stack>
  );
}
