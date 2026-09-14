import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { Relation } from '@/lib/scoring';

export interface ScoreCellProps {
  /** Score for the active basis. Undefined = not entered, null = picked up. */
  value: number | null | undefined;
  relation?: Relation;
  /** Strokes received on this hole (dots in the corner). */
  strokes: number;
  current?: boolean;
}

const BOX = 26;

/**
 * 40pt cell with a 26pt marker box. Birdie = positive circle, eagle = double circle,
 * bogey = negative square, double+ = double square. Stroke dots sit in the top-right corner.
 */
export function ScoreCell({ value, relation, strokes, current }: ScoreCellProps) {
  const { c, radius } = useTheme();
  const under = relation === 'birdie' || relation === 'eagle' || relation === 'albatross';
  const over = relation === 'bogey' || relation === 'double' || relation === 'triple-plus';
  const double = relation === 'eagle' || relation === 'albatross' || relation === 'double' || relation === 'triple-plus';
  const markerColor = under ? c.positive : over ? c.negative : 'transparent';
  const scored = typeof value === 'number';

  const a11y = value === undefined ? 'not entered' : value === null ? 'picked up' : `${value}${relation ? `, ${relation.replace('-plus', ' or worse')}` : ''}${strokes ? `, ${strokes > 0 ? `${strokes} stroke${strokes > 1 ? 's' : ''}` : 'gives one back'}` : ''}`;
  return (
    <View accessible accessibilityLabel={a11y} style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: current ? c.currentHole : 'transparent' }}>
      <View
        style={{
          width: BOX,
          height: BOX,
          borderRadius: under ? 999 : radius.xs,
          borderWidth: scored && (under || over) ? 2 : 0,
          borderColor: markerColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {scored && double ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: BOX + 7,
              height: BOX + 7,
              borderRadius: under ? 999 : radius.xs + 2,
              borderWidth: 1.5,
              borderColor: markerColor,
            }}
          />
        ) : null}
        <Text step="cell">{value === undefined ? '' : value === null ? '–' : String(value)}</Text>
      </View>
      {strokes !== 0 ? (
        <View style={{ position: 'absolute', top: 3, right: 3, flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: Math.min(Math.abs(strokes), 3) }, (_, i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                backgroundColor: strokes < 0 ? 'transparent' : c.strokeMarker,
                borderWidth: strokes < 0 ? 1.5 : 0,
                borderColor: c.strokeMarker,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
