import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text, type TextProps } from '@/components/ui';
import type { Relation } from '@/lib/scoring';

export interface ScoreMarkProps {
  /** The score shown. Undefined = not entered (a faint dot), null = picked up ("PU"). */
  value: number | null | undefined;
  relation?: Relation;
  /** Marker diameter in pt. */
  size: number;
  step?: TextProps['step'];
  /** Leave an unentered score empty instead of a faint dot (grids, where the dot would read as a stroke). */
  blank?: boolean;
}

/**
 * Golf scorecard notation, the way a paper card is marked: a circle for a birdie, two for an eagle or better; a square
 * for a bogey, two for a double or worse. Pine under par, gold over, so the shape carries the meaning and colour only
 * repeats it. Decorative: the row or column around it reads the score to VoiceOver.
 */
export function ScoreMark({ value, relation, size, step = 'cellMd', blank }: ScoreMarkProps) {
  const { c } = useTheme();
  const scored = typeof value === 'number';
  const under = relation === 'birdie' || relation === 'eagle' || relation === 'albatross';
  const over = relation === 'bogey' || relation === 'double' || relation === 'triple-plus';
  const double = relation === 'eagle' || relation === 'albatross' || relation === 'double' || relation === 'triple-plus';
  const mark = scored && (under || over);
  const tint = under ? c.accent : c.gold;
  const corner = Math.round(size * 0.22);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {mark ? (
        <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: under ? 999 : corner, borderWidth: 1.5, borderColor: tint }} />
      ) : null}
      {mark && double ? (
        <View pointerEvents="none" style={{ position: 'absolute', width: size - 6, height: size - 6, borderRadius: under ? 999 : Math.max(2, corner - 2), borderWidth: 1.5, borderColor: tint }} />
      ) : null}
      {value === undefined ? (
        blank ? null : <View style={{ width: 4, height: 4, borderRadius: 999, backgroundColor: c.tickUpcoming }} />
      ) : (
        <Text step={step} style={{ color: value === null ? c.textSecondary : under ? c.accentText : over ? c.goldText : c.textPrimary }} maxFontSizeMultiplier={1.3} numberOfLines={1}>
          {value === null ? 'PU' : String(value)}
        </Text>
      )}
    </View>
  );
}
