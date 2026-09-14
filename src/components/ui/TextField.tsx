import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme';

export interface TextFieldProps extends TextInputProps {
  /** 52pt search-style field with raised surface; default is a 48pt inline field on the ground color. */
  variant?: 'inline' | 'search';
}

/** The only text input. Keyboard appears on exactly two screens: player names and manual course entry. */
export function TextField({ variant = 'inline', style, ...rest }: TextFieldProps) {
  const { c, t, radius, space } = useTheme();
  const search = variant === 'search';
  return (
    <TextInput
      placeholderTextColor={c.textSecondary}
      selectionColor={c.accent}
      autoCorrect={false}
      {...rest}
      style={[
        {
          height: search ? 52 : 48,
          borderRadius: search ? 12 : radius.md,
          borderWidth: 1.5,
          borderColor: c.divider,
          backgroundColor: search ? c.surfaceRaised : c.surface,
          paddingHorizontal: space[3],
          color: c.textPrimary,
          fontFamily: search ? t.body.fontFamily : t.cell.fontFamily,
          fontSize: 17,
        },
        style,
      ]}
    />
  );
}
