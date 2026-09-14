import { useColorScheme } from 'react-native';
import { color, type ColorScheme, elevation, type ElevationSet, type, space, radius, hit, motion } from './tokens';

export type Scheme = 'light' | 'dark';

export interface Theme {
  scheme: Scheme;
  c: ColorScheme;
  e: ElevationSet;
  t: typeof type;
  space: typeof space;
  radius: typeof radius;
  hit: typeof hit;
  motion: typeof motion;
}

export function resolveTheme(scheme: Scheme): Theme {
  return { scheme, c: color[scheme], e: elevation[scheme], t: type, space, radius, hit, motion };
}

/** Follows the system setting. Light is the chalk-paper theme; dark is Nocturne. */
export function useTheme(): Theme {
  const system = useColorScheme();
  return resolveTheme(system === 'dark' ? 'dark' : 'light');
}
