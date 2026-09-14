import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'tinted';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  /** Light haptic on press. On by default for primary. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary: 60pt, radius 14, display face 20. Dark mode renders as an accent-outlined tinted fill.
 * Secondary: 48pt outlined with the divider color.
 * Tinted: accentTint fill with an accent border and accentText label.
 * Disabled: 40% opacity. Pressed states are real feedback, not decoration.
 */
export function Button({ label, variant = 'primary', haptic, disabled, onPress, style, ...rest }: ButtonProps) {
  const { c, radius, hit } = useTheme();
  const useHaptic = haptic ?? variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={(e) => {
        if (useHaptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.(e);
      }}
      style={({ pressed }) => {
        const height = variant === 'primary' ? hit.primaryButton : hit.secondaryButton;
        const bg =
          variant === 'primary'
            ? pressed
              ? c.buttonPrimaryPressed
              : c.buttonPrimary
            : variant === 'tinted'
              ? c.accentTint
              : pressed
                ? c.accentTint
                : 'transparent';
        const border =
          variant === 'primary'
            ? pressed
              ? c.buttonPrimaryPressed
              : c.buttonPrimaryBorder
            : variant === 'tinted'
              ? c.accent
              : pressed
                ? c.accent
                : c.divider;
        return [
          {
            height,
            borderRadius: radius.lg,
            backgroundColor: bg,
            borderColor: border,
            borderWidth: variant === 'primary' ? 1 : 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
            opacity: disabled ? 0.4 : 1,
          } as ViewStyle,
          style,
        ];
      }}
      {...rest}
    >
      {variant === 'primary' ? (
        <Text step="button" style={{ color: c.buttonPrimaryText }}>
          {label}
        </Text>
      ) : (
        <Text step="bodyStrong" tone={variant === 'tinted' ? 'accent' : 'primary'}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
