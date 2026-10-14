import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/**
 * The stack inside each tab: cream bars, pine back button, no hairline. Screens turn the native header on themselves
 * (ScrollScreen), so a screen that still draws its own header shows only that one.
 */
export function TabStack() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.surface },
        headerStyle: { backgroundColor: c.surface },
        headerLargeStyle: { backgroundColor: c.surface },
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: c.accent,
        headerTitleStyle: { color: c.textPrimary },
        headerLargeTitleStyle: { color: c.textPrimary },
      }}
    />
  );
}
