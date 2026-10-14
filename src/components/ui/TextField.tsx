import { useState } from 'react';
import { Platform, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Applied to the field (width, flex). */
  style?: StyleProp<ViewStyle>;
  /** Applied to the input text (textAlign). */
  inputStyle?: TextInputProps['style'];
}

/**
 * A standalone text field (sign-in, a sheet's new entry): 50pt, recessed, with a pine ring while focused. Inside a
 * grouped list use FormRow instead.
 */
export function TextField({ style, inputStyle, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { c, t, space } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        {
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: focused ? c.accent : 'transparent',
          backgroundColor: c.surfaceRaised2,
          paddingHorizontal: space[4],
          overflow: 'hidden',
          minWidth: 0,
        },
        style,
      ]}
    >
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
            fontSize: t.rowBody.fontSize,
            paddingVertical: 8,
          },
          inputStyle,
        ]}
      />
    </View>
  );
}
