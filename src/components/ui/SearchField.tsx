import { TextInput, View } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from './Icon';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** VoiceOver name; defaults to the placeholder. */
  accessibilityLabel?: string;
  testID?: string;
}

/** The iOS search field: a recessed rounded bar with a magnifying glass and a clear button while typing. */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, testID }: SearchFieldProps) {
  const { c, t, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 40, paddingHorizontal: space[3], borderRadius: 10, backgroundColor: c.surfaceRaised2 }}>
      <Icon name="search" size={17} color={c.textTertiary} />
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        accessibilityRole="search"
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        testID={testID}
        style={{ flex: 1, color: c.textPrimary, fontSize: t.rowBody.fontSize, paddingVertical: space[2] }}
      />
    </View>
  );
}
