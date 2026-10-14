import { color, type ColorScheme, elevation, type ElevationSet, type, weight, space, layout, radius, hit, motion, seatColors } from './tokens';

export type Scheme = 'light' | 'dark';

export interface Theme {
  /** Always 'light' for now; dark mode is a post-launch item. */
  scheme: Scheme;
  c: ColorScheme;
  e: ElevationSet;
  t: typeof type;
  /** Font weights for the rare override (the step usually carries the weight). */
  w: typeof weight;
  /** A player's colour by seat in a round. */
  seats: typeof seatColors;
  space: typeof space;
  layout: typeof layout;
  radius: typeof radius;
  hit: typeof hit;
  motion: typeof motion;
}

const LIGHT: Theme = { scheme: 'light', c: color.light, e: elevation.light, t: type, w: weight, seats: seatColors, space, layout, radius, hit, motion };

/** The app is light only. */
export function useTheme(): Theme {
  return LIGHT;
}
