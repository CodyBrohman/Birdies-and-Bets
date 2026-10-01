import { createContext, useContext, type ReactNode } from 'react';
import { color, type ColorScheme, elevation, type ElevationSet, type, font, space, layout, radius, hit, motion } from './tokens';
import type { Scheme } from './preference';

export type { Scheme } from './preference';

export interface Theme {
  scheme: Scheme;
  c: ColorScheme;
  e: ElevationSet;
  t: typeof type;
  f: typeof font;
  space: typeof space;
  layout: typeof layout;
  radius: typeof radius;
  hit: typeof hit;
  motion: typeof motion;
}

export function resolveTheme(scheme: Scheme): Theme {
  return { scheme, c: color[scheme], e: elevation[scheme], t: type, f: font, space, layout, radius, hit, motion };
}

const ThemeOverride = createContext<Scheme | null>(null);

/** Force a scheme for a subtree (the share card always renders light). */
export function ThemeScope({ scheme, children }: { scheme: Scheme; children: ReactNode }) {
  return <ThemeOverride.Provider value={scheme}>{children}</ThemeOverride.Provider>;
}

const LIGHT = resolveTheme('light');

/** The app is light only (2026-10-01 redesign). The scheme override is kept for API compatibility. */
export function useTheme(): Theme {
  useContext(ThemeOverride);
  return LIGHT;
}
