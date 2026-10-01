import { View, type ViewProps, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme';
import { DISABLED_OPACITY, interaction, stateTransition } from './interaction';

export type CardVariant = 'raised' | 'outlined' | 'tinted' | 'gold' | 'accent' | 'hero';

export interface CardProps extends ViewProps {
  /**
   * raised = warm white card with a 1pt hairline (most cards).
   * outlined = alias of raised, kept so older call sites compile.
   * tinted = soft sage ("Find your next fairway", "Plan a round").
   * gold = gold tint (attention callouts).
   * accent = sage tint with a pine border (selected).
   * hero = dark forest ("Your round", the profile card); put white text on it.
   */
  variant?: CardVariant;
  /** Selected: keeps the fill and adds a 1.5pt pine border. */
  selected?: boolean;
  /** 1pt coloured border: the live round card, a highlighted result. */
  edge?: 'accent' | 'gold';
  /** 12 (dense), 16 (default) or 20 (roomy) padding. */
  padding?: 'dense' | 'default' | 'roomy' | 'none';
  /** Makes the whole card a button with pressed, hover and focus states. */
  onPress?: () => void;
  disabled?: boolean;
}

/** The container for nearly everything. 20pt corners, warm white with a hairline on cream. */
export function Card({ variant = 'raised', selected, edge, padding = 'default', onPress, disabled, style, children, ...rest }: CardProps) {
  const { c, e, radius, space } = useTheme();
  const plain = variant === 'raised' || variant === 'outlined';
  const fill = plain ? c.surfaceRaised : variant === 'hero' ? c.hero : variant === 'gold' ? c.goldTint : c.accentTint;
  const border = selected || variant === 'accent' ? c.accent : edge === 'accent' ? c.accentBorder : edge === 'gold' ? c.goldBorder : plain ? c.divider : 'transparent';
  const pad = padding === 'none' ? 0 : padding === 'dense' ? space[3] : padding === 'roomy' ? space[5] : space[4];
  const baseStyle: ViewStyle = {
    backgroundColor: fill,
    borderColor: border,
    borderWidth: selected || variant === 'accent' ? 1.5 : 1,
    borderRadius: variant === 'hero' ? radius.hero : radius.xl,
    padding: pad,
    ...(plain ? e.raised : null),
  };

  if (!onPress) {
    return (
      <View {...rest} style={[baseStyle, { overflow: 'hidden' }, style]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={(s) => {
        const { pressed, hovered } = interaction(s);
        return [
          baseStyle,
          stateTransition,
          plain && (pressed || hovered) ? e.lifted : null,
          pressed ? { opacity: 0.85 } : null,
          hovered && !pressed && !plain ? { opacity: 0.92 } : null,
          disabled ? { opacity: DISABLED_OPACITY } : null,
          style as ViewStyle,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}
