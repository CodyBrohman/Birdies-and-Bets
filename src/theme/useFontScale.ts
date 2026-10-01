import { useWindowDimensions } from 'react-native';

/**
 * The user's text-size multiplier, capped, for layout maths that must grow with type (cell boxes, columns).
 * Text itself scales through each type step's own cap; this is only for the boxes around it.
 */
export function useFontScale(cap: number = 1.3): number {
  const { fontScale } = useWindowDimensions();
  return Math.max(1, Math.min(fontScale || 1, cap));
}
