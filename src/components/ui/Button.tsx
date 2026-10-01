import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { haptic, useTheme } from '@/theme';
import { Text } from './Text';
import { DISABLED_OPACITY, interaction, stateTransition } from './interaction';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * primary = pine fill, white label ("Continue setup").
 * secondary = card white with a hairline, pine label ("Invite").
 * tinted = recessed sage-grey fill, pine label ("Join their round").
 * hero = the pine that sits on a dark hero card ("Start this round").
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'hero';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  /** lg = 56pt (the CTA), md = 48pt, sm = 40pt compact (inline actions in cards). */
  size?: 'lg' | 'md' | 'sm';
  /** Leading glyph in the label colour (the mockups' arrow). */
  icon?: IoniconName;
  /** Icon at the right edge. Label aligns left when present. */
  trailingIcon?: ReactNode;
  /** Light haptic on press. On by default for primary. */
  haptic?: boolean;
  /** Secondary only: label in the negative colour (Clear all data). */
  destructive?: boolean;
  /** Spinner in place of the icon; the button keeps its size and ignores presses. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Rounded-rectangle buttons (16pt corners, 12 when smaller). States: pressed (deeper fill), hover, focus ring, loading, disabled 40%. */
export function Button({ label, variant = 'primary', size, icon, trailingIcon, haptic: hapticProp, destructive, loading, disabled, onPress, style, ...rest }: ButtonProps) {
  const { c, e, f, hit } = useTheme();
  const filled = variant === 'primary' || variant === 'hero';
  const useHaptic = hapticProp ?? filled;
  const resolved = size ?? (filled ? 'lg' : 'md');
  const height = resolved === 'lg' ? hit.primaryButton : resolved === 'md' ? hit.secondaryButton : 40;
  const labelColor = filled ? c.onAccent : destructive ? c.negative : c.accentText;
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={inert}
      hitSlop={resolved === 'sm' ? 4 : 0}
      onPress={(ev) => {
        if (useHaptic) haptic.light();
        onPress?.(ev);
      }}
      style={(s) => {
        const { pressed, hovered } = interaction(s);
        const active = pressed || hovered;
        const bg =
          variant === 'primary'
            ? active ? c.accentSoft : c.accent
            : variant === 'hero'
              ? active ? c.accentSoft : c.heroRaised
              : variant === 'tinted'
                ? active ? c.dividerSoft : c.neutralChip
                : active ? c.surfaceRaised2 : c.surfaceRaised;
        return [
          {
            minHeight: height,
            paddingVertical: 6,
            borderRadius: resolved === 'lg' ? 16 : 12,
            backgroundColor: bg,
            gap: 8,
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: c.divider,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: trailingIcon ? 'space-between' : 'center',
            paddingLeft: resolved === 'sm' ? 12 : 20,
            paddingRight: trailingIcon || resolved === 'sm' ? 12 : 20,
            opacity: disabled ? DISABLED_OPACITY : pressed ? 0.92 : 1,
            ...(variant === 'secondary' ? (hovered ? e.lifted : e.raised) : null),
          } as ViewStyle,
          stateTransition,
          style,
        ];
      }}
      {...rest}
    >
      {loading ? <ActivityIndicator size="small" color={labelColor} /> : icon ? <Ionicons name={icon} size={resolved === 'sm' ? 16 : 18} color={labelColor} /> : null}
      <Text step={resolved === 'sm' ? 'label' : 'button'} style={{ color: labelColor, fontFamily: f.uiBold }} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon ? <View style={{ alignItems: 'center', justifyContent: 'center' }}>{trailingIcon}</View> : null}
    </Pressable>
  );
}
