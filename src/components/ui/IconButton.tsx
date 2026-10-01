import { type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { DISABLED_OPACITY, interaction, stateTransition } from './interaction';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: IoniconName;
  /** Accessibility label. Required: the button has no text. */
  label: string;
  /** 44 by default (36 for tinted); hitSlop takes it to 48+. */
  size?: number;
  /** raised = white disc with a hairline; plain = bare glyph; tinted = recessed rounded square (the Friends "+"). */
  variant?: 'raised' | 'plain' | 'tinted';
  iconSize?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Icon button: back, close, previous/next hole, add friend. */
export function IconButton({ icon, label, size, variant = 'raised', iconSize = 22, color, disabled, style, ...rest }: IconButtonProps) {
  const { c, e, radius } = useTheme();
  const tinted = variant === 'tinted';
  const d = size ?? (tinted ? 36 : 44);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={tinted ? 8 : 4}
      style={(s) => {
        const { pressed, hovered } = interaction(s);
        const active = pressed || hovered;
        const bg = variant === 'raised' ? (active ? c.surfaceRaised2 : c.surfaceRaised) : tinted ? (active ? c.dividerSoft : c.neutralChip) : pressed ? c.surfaceRaised2 : hovered ? c.hover : 'transparent';
        return [
          {
            width: d,
            height: d,
            borderRadius: tinted ? 10 : radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bg,
            borderWidth: variant === 'raised' ? 1 : 0,
            borderColor: c.divider,
            opacity: disabled ? DISABLED_OPACITY : 1,
            ...(variant === 'raised' ? e.raised : null),
          } as ViewStyle,
          stateTransition,
          style,
        ];
      }}
      {...rest}
    >
      <Ionicons name={icon} size={tinted ? 18 : iconSize} color={color ?? c.textPrimary} />
    </Pressable>
  );
}
