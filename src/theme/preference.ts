import { create } from 'zustand';

export type Scheme = 'light' | 'dark';
export type ThemePreference = 'system' | Scheme;

interface PreferenceState {
  preference: ThemePreference;
  setPreference(preference: ThemePreference): void;
}

/**
 * In-memory theme preference. Persistence lives in store/themeStore so theme/ never imports store/.
 * Defaults to following the system.
 */
export const useThemePreference = create<PreferenceState>()((set) => ({
  preference: 'system',
  setPreference: (preference) => set({ preference }),
}));

export function isThemePreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}

/** The scheme to render: an explicit preference wins, otherwise the system setting (light when unknown). */
export function resolveScheme(preference: ThemePreference, system: string | null | undefined): Scheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

/** What the moon button does: from system, jump to the opposite of what is showing; then flip. */
export function nextPreference(current: ThemePreference, effective: Scheme): ThemePreference {
  if (current === 'system') return effective === 'dark' ? 'light' : 'dark';
  return current === 'dark' ? 'light' : 'dark';
}
