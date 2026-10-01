import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text, type TextTone } from './Text';

export interface StatTileProps {
  /** Short sentence-case label above the number. Wraps rather than truncating. */
  label: string;
  value: string;
  /** Colour of the number. */
  tone?: TextTone;
  /** Small line under the number ("+4", "2 under"). */
  sub?: string;
  subTone?: TextTone;
  style?: StyleProp<ViewStyle>;
}

/** Recessed stat tile inside a card: quiet label, one big bold number. Reads as one element. */
export function StatTile({ label, value, tone = 'primary', sub, subTone = 'secondary', style }: StatTileProps) {
  const { c, radius, space } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`} style={[{ flex: 1, minWidth: 0, alignItems: 'center', gap: 2, paddingVertical: space[3], paddingHorizontal: space[1], borderRadius: radius.lg, backgroundColor: c.surfaceRaised2 }, style]}>
      <Text step="eyebrow" tone="secondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} align="center">
        {label}
      </Text>
      <Text step="score" tone={tone} numberOfLines={1} adjustsFontSizeToFit align="center" maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      {sub ? (
        <Text step="caption" tone={subTone} numberOfLines={1} align="center">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
