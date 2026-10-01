import { View } from 'react-native';
import { useFontScale, useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { Relation } from '@/lib/scoring';
import { describeScore } from '@/lib/format';
import { StrokeDots } from './StrokeDots';

export interface ScoreCellProps {
  /** Score for the active basis. Undefined = not entered, null = picked up. */
  value: number | null | undefined;
  relation?: Relation;
  /** Strokes received on this hole (dots in the corner). */
  strokes: number;
  /** Hidden from VoiceOver when the containing row already reads the score. */
  hidden?: boolean;
}

const BOX = 40;

/**
 * One scorecard cell. Birdie = green circle, eagle = double circle, bogey = gold rounded square,
 * double+ = double square. Stroke dots sit in the top-right corner. Unentered shows a faint dot.
 * The box grows with the user's text size so a large-type "10" still fits inside its marker.
 */
export function ScoreCell({ value, relation, strokes, hidden }: ScoreCellProps) {
  const { c, radius } = useTheme();
  const scale = useFontScale();
  const box = Math.round(BOX * scale);
  const under = relation === 'birdie' || relation === 'eagle' || relation === 'albatross';
  const over = relation === 'bogey' || relation === 'double' || relation === 'triple-plus';
  const double = relation === 'eagle' || relation === 'albatross' || relation === 'double' || relation === 'triple-plus';
  const markerColor = under ? c.accent : over ? c.gold : 'transparent';
  const scored = typeof value === 'number';

  return (
    <View
      accessible={!hidden}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityLabel={describeScore(value, relation, strokes)}
      style={{ flex: 1, minHeight: box + 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: box,
          height: box,
          borderRadius: under ? 999 : radius.md,
          borderWidth: scored && (under || over) ? 2 : 0,
          borderColor: markerColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {scored && double ? (
          <View pointerEvents="none" style={{ position: 'absolute', width: box + 8, height: box + 8, borderRadius: under ? 999 : radius.md + 3, borderWidth: 1.5, borderColor: markerColor }} />
        ) : null}
        {value === undefined ? (
          <View style={{ width: 4, height: 4, borderRadius: 999, backgroundColor: c.textTertiary }} />
        ) : (
          <Text step="cell">{value === null ? '–' : String(value)}</Text>
        )}
      </View>
      {strokes !== 0 ? (
        <View style={{ position: 'absolute', top: 6, right: 4 }}>
          <StrokeDots strokes={strokes} size={4} max={3} />
        </View>
      ) : null}
    </View>
  );
}
