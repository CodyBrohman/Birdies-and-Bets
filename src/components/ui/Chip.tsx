import { type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { haptic, useTheme } from '@/theme';
import { Text } from './Text';
import { DISABLED_OPACITY, interaction, stateTransition } from './interaction';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  haptic?: boolean;
  /** pill (default) = filter and club pills; time = small recessed rounded chip ("8:30 AM"). */
  shape?: 'pill' | 'time';
  style?: StyleProp<ViewStyle>;
}

/** Filter pill: white with a hairline and a pine label; selected = pine fill, white label. 40pt with hitSlop to 48. */
export function Chip({ label, selected = false, onPress, accessibilityLabel, disabled, haptic: useHaptic = true, shape = 'pill', style }: ChipProps) {
  const { c, f, hit, radius } = useTheme();
  const time = shape === 'time';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={time ? 6 : 4}
      onPress={() => {
        if (useHaptic) haptic.selection();
        onPress();
      }}
      style={(s) => {
        const { pressed, hovered } = interaction(s);
        const idle = time ? (pressed || hovered ? c.dividerSoft : c.neutralChip) : pressed ? c.surfaceRaised2 : hovered ? c.hover : c.surfaceRaised;
        return [
          {
            minHeight: time ? 36 : hit.pill,
            paddingVertical: 6,
            paddingHorizontal: time ? 12 : 16,
            borderRadius: time ? 10 : radius.pill,
            borderWidth: selected || time ? 0 : 1,
            borderColor: c.divider,
            backgroundColor: selected ? (pressed ? c.accentSoft : c.inverse) : idle,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? DISABLED_OPACITY : 1,
          } as ViewStyle,
          stateTransition,
          style,
        ];
      }}
    >
      <Text step="label" style={{ color: selected ? c.onInverse : c.accentText, fontFamily: f.uiBold, fontSize: time ? 13 : 14 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
