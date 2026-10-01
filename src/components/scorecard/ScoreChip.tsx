
import { haptic, useFontScale, useTheme } from '@/theme';
import { Text, interaction, stateTransition, Pressable } from '@/components/ui';

export interface ScoreChipProps {
  /** Number shown large; "–" for pick up. */
  value: string;
  /** Small caption: Eagle, Birdie, Par … or Pick up. */
  caption: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  /** Fixed width from a grid; defaults to the 62pt token scaled with Dynamic Type. */
  width?: number;
}

/** Score tile, 64pt tall. Recessed fill at rest; inverse-filled when selected. Haptic on tap. */
export function ScoreChip({ value, caption, selected, onPress, accessibilityLabel, width }: ScoreChipProps) {
  const { c, hit, radius } = useTheme();
  const scale = useFontScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={(s) => {
        const { pressed, hovered } = interaction(s);
        return [
          {
            width: width ?? Math.round(hit.scoreEntry * scale),
            minHeight: 64,
            paddingVertical: 8,
            borderRadius: radius.chip,
            backgroundColor: selected ? c.inverse : pressed ? c.dividerSoft : hovered ? c.divider : c.surfaceRaised2,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          },
          stateTransition,
        ];
      }}
    >
      <Text step="score" tone={selected ? 'onInverse' : 'primary'}>
        {value}
      </Text>
      <Text step="caption" tone={selected ? 'onInverse' : 'secondary'} tabular={false} style={{ fontSize: 12, lineHeight: 14 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {caption}
      </Text>
    </Pressable>
  );
}
