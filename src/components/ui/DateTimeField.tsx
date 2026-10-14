import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface DateTimeFieldProps {
  value: Date;
  onChange: (value: Date) => void;
  accessibilityLabel: string;
  minimumDate?: Date;
  /** Shown on the web preview, where there is no native picker. */
  webText: string;
}

/** The native compact date and time picker (iOS); the web preview shows the value as text. */
export function DateTimeField({ value, onChange, accessibilityLabel, minimumDate, webText }: DateTimeFieldProps) {
  const { c } = useTheme();
  if (Platform.OS === 'web') {
    return (
      <Text step="rowBody" tone="secondary" accessibilityLabel={`${accessibilityLabel}: ${webText}`}>
        {webText}
      </Text>
    );
  }
  return (
    <DateTimePicker
      value={value}
      mode="datetime"
      display="compact"
      minuteInterval={5}
      minimumDate={minimumDate}
      accentColor={c.accent}
      themeVariant="light"
      accessibilityLabel={accessibilityLabel}
      testID="tee-time-picker"
      onChange={(e, d) => {
        if (e.type === 'set' && d) onChange(d);
      }}
    />
  );
}
