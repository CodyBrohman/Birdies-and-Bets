import { ActivityIndicator, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { haptic, PRESSED_OPACITY, useTheme } from '@/theme';
import { Text } from './Text';
import { DISABLED_OPACITY, interaction, stateTransition } from './interaction';

/**
 * primary = pine fill, white label: the one main action on a screen ("Start round").
 * secondary = soft pine tint, pine label ("Add player").
 * plain = a text button, no fill ("Skip for now").
 * hero = the pine button on the dark round-in-progress card ("Resume round").
 */
export type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'hero';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  /** lg = 50pt (the main action), md = 44pt (everything else). */
  size?: 'lg' | 'md';
  /** Light haptic on press. On by default for filled buttons. */
  haptic?: boolean;
  /** A destructive action, on any variant: coral fill when filled, a coral label otherwise. Never a green "Delete". */
  destructive?: boolean;
  /** Spinner beside the label; the button keeps its size and ignores presses. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Rounded-rectangle buttons with a verb + noun label and no icons. States: pressed (dimmed), hover, focus ring, loading, disabled. */
export function Button({ label, variant = 'primary', size, haptic: hapticProp, destructive, loading, disabled, onPress, style, ...rest }: ButtonProps) {
  const { c, w, hit } = useTheme();
  const filled = variant === 'primary' || variant === 'hero';
  const useHaptic = hapticProp ?? filled;
  const resolved = size ?? (filled ? 'lg' : 'md');
  const labelColor = filled ? c.onAccent : destructive ? c.destructive : variant === 'secondary' ? c.accentTintText : c.accentText;
  const fill = filled ? (destructive ? c.destructive : variant === 'hero' ? c.heroRaised : c.accent) : variant === 'secondary' ? (destructive ? c.negativeTint : c.accentTint) : 'transparent';
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={inert}
      onPress={(ev) => {
        if (useHaptic) haptic.light();
        onPress?.(ev);
      }}
      style={(s) => {
        const { pressed, hovered } = interaction(s);
        return [
          {
            minHeight: resolved === 'lg' ? hit.primaryButton : hit.secondaryButton,
            paddingVertical: 8,
            paddingHorizontal: variant === 'plain' ? 8 : 20,
            borderRadius: resolved === 'lg' ? 14 : 12,
            backgroundColor: hovered && variant === 'plain' ? c.hover : fill,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: disabled ? DISABLED_OPACITY : pressed ? PRESSED_OPACITY : hovered && filled ? 0.9 : 1,
          } as ViewStyle,
          stateTransition,
          style,
        ];
      }}
      {...rest}
    >
      {loading ? <ActivityIndicator size="small" color={labelColor} /> : null}
      <Text step="rowTitle" style={{ color: labelColor, fontWeight: w.semibold, flexShrink: 1 }} align="center" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}
