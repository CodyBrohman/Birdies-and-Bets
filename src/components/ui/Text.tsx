import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme, type TypeStepName } from '@/theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'accentSolid'
  | 'accentTintText'
  | 'positive'
  | 'positiveText'
  | 'gold'
  | 'goldText'
  | 'negative'
  | 'onAccent'
  | 'onInverse'
  | 'inherit';

export interface TextProps extends RNTextProps {
  /** Type scale step from tokens. Defaults to body. */
  step?: TypeStepName;
  tone?: TextTone;
  /** Force tabular figures regardless of the step default. */
  tabular?: boolean;
  /** Playfair Display instead of Inter: the share card's brand header only. */
  serif?: boolean;
  /** With `serif`, the italic face (the "& Bets" wordmark). */
  italic?: boolean;
  align?: TextStyle['textAlign'];
}

/**
 * The only text primitive. Reads family, size, line height, tracking and case from the type scale
 * and applies tabular lining numerals on the steps that require them.
 */
export function Text({ step = 'body', tone = 'primary', tabular, serif, italic, align, style, ...rest }: TextProps) {
  const { c, t, f } = useTheme();
  const spec = t[step] as (typeof t)[TypeStepName] & { letterSpacing?: number; uppercase?: boolean; maxScale: number };
  const colors: Record<Exclude<TextTone, 'inherit'>, string> = {
    primary: c.textPrimary,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    accent: c.accentText,
    accentSolid: c.accent,
    accentTintText: c.accentTintText,
    positive: c.positive,
    positiveText: c.positiveText,
    gold: c.gold,
    goldText: c.goldText,
    negative: c.negative,
    onAccent: c.onAccent,
    onInverse: c.onInverse,
  };
  const color = tone === 'inherit' ? undefined : colors[tone];
  const useTabular = tabular ?? spec.tabular;

  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={spec.maxScale}
      {...rest}
      style={[
        {
          fontFamily: serif ? (italic ? f.serifItalic : f.serif) : spec.fontFamily,
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          textAlign: align,
          ...(spec.letterSpacing != null ? { letterSpacing: spec.letterSpacing } : null),
          ...(spec.uppercase ? { textTransform: 'uppercase' as const } : null),
          ...(color ? { color } : null),
          ...(useTabular ? { fontVariant: ['tabular-nums' as const] } : null),
        },
        style,
      ]}
    />
  );
}
