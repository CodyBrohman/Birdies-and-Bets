import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface FormRowProps extends Omit<TextInputProps, 'style'> {
  /** Shown on the left; the field takes the rest of the row. */
  label?: string;
  /** Coral text when the value has a problem (say what in the section footer). */
  invalid?: boolean;
  /** Set by ListSection. */
  first?: boolean;
}

/** A text field as a row in an inset-grouped form: an optional label, then the field, 44pt or taller. */
export function FormRow({ label, invalid, first, accessibilityLabel, ...input }: FormRowProps) {
  const { c, t, space } = useTheme();
  return (
    <View style={{ paddingLeft: space[4] }}>
      {!first ? <View style={{ height: 1, backgroundColor: c.divider }} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingRight: space[4] }}>
        {label ? (
          <Text step="rowBody" style={{ width: 96 }} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={c.textTertiary}
          {...input}
          style={{ flex: 1, minHeight: 44, color: invalid ? c.destructive : c.textPrimary, fontSize: t.rowBody.fontSize, paddingVertical: space[2] }}
        />
      </View>
    </View>
  );
}
