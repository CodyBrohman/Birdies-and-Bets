import { useColorScheme } from 'react-native';
import { isThemePreference, nextPreference, resolveScheme, useThemePreference, type Scheme, type ThemePreference } from '@/theme';
import { storage, STORAGE_KEYS } from './storage';

let subscribed = false;

/** Read the saved preference into the theme layer and start persisting changes. Safe to call more than once. */
export async function hydrateThemePreference(): Promise<void> {
  try {
    const saved = await storage.get<ThemePreference>(STORAGE_KEYS.themePreference);
    if (isThemePreference(saved)) useThemePreference.getState().setPreference(saved);
  } catch {
    // Fall back to the system setting.
  }
  if (!subscribed) {
    subscribed = true;
    useThemePreference.subscribe((s, prev) => {
      if (s.preference !== prev.preference) void storage.set(STORAGE_KEYS.themePreference, s.preference);
    });
  }
}

/** For the moon button: what is showing now and a toggle that flips it (and persists). */
export function useThemeToggle(): { preference: ThemePreference; effective: Scheme; cycle(): void } {
  const system = useColorScheme();
  const preference = useThemePreference((s) => s.preference);
  const setPreference = useThemePreference((s) => s.setPreference);
  const effective = resolveScheme(preference, system);
  return { preference, effective, cycle: () => setPreference(nextPreference(preference, effective)) };
}
