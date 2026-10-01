import { useState, type ReactNode } from 'react';
import { Platform, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /**
   * inline (default) = 50pt recessed rounded field. search = 54pt white field with a hairline and a leading icon.
   * underline = bare bold value over a hairline (the profile form: "Your name / Alex Morgan").
   */
  variant?: 'inline' | 'search' | 'underline';
  leading?: ReactNode;
  /** Optional small label above the field ("Your name"). The accessibility label still comes from props. */
  label?: string;
  /** Applied to the outer pill (width, flex). */
  style?: StyleProp<ViewStyle>;
  /** Applied to the input text (textAlign). */
  inputStyle?: TextInputProps['style'];
}

/** The only text input. Rounded, a 1.5pt pine ring while focused. Callers pass borderColor for errors. */
export function TextField({ variant = 'inline', leading, label, style, inputStyle, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { c, e, t, radius, space } = useTheme();
  const [focused, setFocused] = useState(false);
  const search = variant === 'search';
  const underline = variant === 'underline';
  const field = (
    <View
      style={[
        underline
          ? { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space[2], borderBottomWidth: focused ? 1.5 : 1, borderColor: focused ? c.accent : c.divider, minWidth: 0 }
          : {
          minHeight: search ? 54 : 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          borderRadius: search ? 16 : radius.lg,
          borderWidth: search ? 1 : 1.5,
          borderColor: focused ? c.accent : search ? c.divider : 'transparent',
          backgroundColor: search ? c.surfaceRaised : c.surfaceRaised2,
          ...(search ? e.raised : null),
          paddingHorizontal: search ? space[4] : space[4],
          overflow: 'hidden',
          minWidth: 0,
        },
        style,
      ]}
    >
      {leading}
      <TextInput
        placeholderTextColor={c.textTertiary}
        selectionColor={c.accent}
        autoCorrect={false}
        maxFontSizeMultiplier={1.6}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            // width 0 + grow defeats the browser's intrinsic <input> width; RN-web ignores minWidth here.
            flexGrow: 1,
            flexShrink: 1,
            width: 0,
            alignSelf: 'stretch',
            color: c.textPrimary,
            ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
            fontFamily: underline ? t.title.fontFamily : t.body.fontFamily,
            fontSize: underline ? 16 : t.body.fontSize,
            paddingVertical: 8,
          },
          inputStyle,
        ]}
      />
    </View>
  );
  if (!label) return field;
  return (
    <View style={{ gap: underline ? 0 : space[2] }}>
      <Text step="caption" tone="secondary" tabular={false}>
        {label}
      </Text>
      {field}
    </View>
  );
}
