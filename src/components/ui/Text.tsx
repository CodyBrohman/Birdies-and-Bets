import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme, type TypeStepName } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'onAccent' | 'inherit';

export interface TextProps extends RNTextProps {
  /** Type scale step from tokens. Defaults to body. */
  step?: TypeStepName;
  tone?: TextTone;
  /** Force tabular figures regardless of the step default. */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
}

/**
 * The only text primitive. Reads family, size and line height from the type scale
 * and applies tabular lining numerals on the steps that require them.
 */
export function Text({ step = 'body', tone = 'primary', tabular, align, style, ...rest }: TextProps) {
  const { c, t } = useTheme();
  const spec = t[step];
  const color =
    tone === 'primary'
      ? c.textPrimary
      : tone === 'secondary'
        ? c.textSecondary
        : tone === 'accent'
          ? c.accentText
          : tone === 'positive'
            ? c.positive
            : tone === 'negative'
              ? c.negative
              : tone === 'onAccent'
                ? c.onAccent
                : undefined;
  const useTabular = tabular ?? spec.tabular;

  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        {
          fontFamily: spec.fontFamily,
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          textAlign: align,
          ...(color ? { color } : null),
          ...(useTabular ? { fontVariant: ['tabular-nums' as const] } : null),
        },
        style,
      ]}
    />
  );
}
