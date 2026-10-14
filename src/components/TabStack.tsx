import { Stack } from 'expo-router';
import type { ColorScheme } from '@/theme';
import { useTheme } from '@/theme';

/** Native bar styling shared by every stack: cream bars, pine back button and bar buttons, no hairline. */
export function stackOptions(c: ColorScheme) {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: c.surface },
    headerStyle: { backgroundColor: c.surface },
    headerLargeStyle: { backgroundColor: c.surface },
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTintColor: c.accent,
    // iOS always centres the title; the web preview's header would put it on the left.
    headerTitleAlign: 'center',
    headerTitleStyle: { color: c.textPrimary },
    headerLargeTitleStyle: { color: c.textPrimary },
  } as const;
}

/** A form sheet over the current screen, with a grabber. `detents` are fractions of the screen height. */
export function formSheet(detents: number[] = [0.5, 1]) {
  return { presentation: 'formSheet', sheetAllowedDetents: detents, sheetGrabberVisible: true, sheetCornerRadius: 22 } as const;
}

/**
 * The stack inside each tab. Headers are off until a screen turns its own on (ScrollScreen), so a screen that still
 * draws its own header shows only that one.
 */
export function TabStack() {
  const { c } = useTheme();
  return <Stack screenOptions={stackOptions(c)} />;
}
