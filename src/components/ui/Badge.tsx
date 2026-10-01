import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** net / positive / accent = sage tint; gross / gold = gold tint; neutral = grey chip. */
export type BadgeTone = 'net' | 'gross' | 'positive' | 'gold' | 'accent' | 'neutral';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Small filled circle before the label ("• 1 stroke"). */
  dot?: boolean;
  /** overline (default, small uppercase: "FOR FUN") or label (sentence case, e.g. "Hole 12 of 18"). */
  text?: 'overline' | 'label';
  style?: StyleProp<ViewStyle>;
}

/** Small rounded badge: FOR FUN / NET / GROSS / strokes / Scratch / hole progress. */
export function Badge({ label, tone = 'neutral', dot, text = 'overline', style }: BadgeProps) {
  const { c, space } = useTheme();
  const palette: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
    net: { bg: c.accentTint, fg: c.accentTintText, dot: c.accent },
    positive: { bg: c.accentTint, fg: c.accentTintText, dot: c.accent },
    accent: { bg: c.accentTint, fg: c.accentTintText, dot: c.accent },
    gross: { bg: c.goldTint, fg: c.goldTintText, dot: c.gold },
    gold: { bg: c.goldTint, fg: c.goldTintText, dot: c.gold },
    neutral: { bg: c.neutralChip, fg: c.neutralChipText, dot: c.textTertiary },
  };
  const p = palette[tone];
  const small = text === 'overline';
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: p.bg,
          borderRadius: small ? 6 : 999,
          paddingHorizontal: small ? 7 : space[3],
          paddingVertical: small ? 3 : 5,
        },
        style,
      ]}
    >
      {dot ? <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: p.dot }} /> : null}
      <Text step={text} style={{ color: p.fg, ...(small ? { fontSize: 11, letterSpacing: 0.6 } : null) }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
