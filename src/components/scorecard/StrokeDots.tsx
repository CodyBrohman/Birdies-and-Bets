import { View } from 'react-native';
import { useTheme } from '@/theme';

export interface StrokeDotsProps {
  /** Strokes received on the hole. Negative = gives one back (hollow ring). */
  strokes: number;
  size?: number;
  /** Cap the dots drawn (the scorecard corner fits three). */
  max?: number;
}

/** Olive dot per stroke received; a hollow ring when a stroke is given back. Renders nothing at zero. */
export function StrokeDots({ strokes, size = 6, max }: StrokeDotsProps) {
  const { c } = useTheme();
  if (strokes === 0) return null;
  const count = max ? Math.min(Math.abs(strokes), max) : Math.abs(strokes);
  const hollow = strokes < 0;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={hollow ? `gives ${count} back` : `${count} stroke${count > 1 ? 's' : ''}`}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            backgroundColor: hollow ? 'transparent' : c.accent,
            borderWidth: hollow ? 1.5 : 0,
            borderColor: c.accent,
          }}
        />
      ))}
    </View>
  );
}
