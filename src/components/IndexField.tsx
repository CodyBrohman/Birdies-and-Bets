import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { TextField } from '@/components/ui';
import { formatIndex, parseIndex } from '@/lib/format';

export interface IndexFieldProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Accessibility label, e.g. "Player 1 handicap index". */
  label: string;
  style?: StyleProp<ViewStyle>;
  /** Commit only when editing ends instead of on every keystroke (profile screen). */
  commitOnBlur?: boolean;
}

/** Handicap index input. Keeps its own text so "+1." and "8." can be typed, committing the parsed number upward. */
export function IndexField({ value, onChange, label, style, commitOnBlur }: IndexFieldProps) {
  const initial = value == null ? '' : formatIndex(value);
  return (
    <TextField
      style={[{ width: 88, height: 52, paddingHorizontal: 8 }, style]}
      inputStyle={{ textAlign: 'center' }}
      placeholder="Index"
      defaultValue={initial}
      onChangeText={commitOnBlur ? undefined : (raw) => onChange(parseIndex(raw))}
      onEndEditing={commitOnBlur ? (e) => onChange(parseIndex(e.nativeEvent.text)) : undefined}
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
      accessibilityLabel={label}
      accessibilityHint="Blank plays scratch. Plus handicaps start with a plus sign"
      maxLength={5}
    />
  );
}
