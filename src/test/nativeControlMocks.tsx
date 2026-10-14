// Accessible stand-ins for native-only controls in Jest (wired up in jest.setup.ts). They expose the same roles
// VoiceOver sees, so screen tests can query them: segments are tabs, pickers are labelled views.
import { Pressable, Text, View } from 'react-native';

export interface MockSegmentedProps {
  values?: string[];
  selectedIndex?: number;
  enabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  onChange?: (e: { nativeEvent: { selectedSegmentIndex: number; value: string } }) => void;
  onValueChange?: (value: string) => void;
}

export function MockSegmentedControl({ values = [], selectedIndex = 0, enabled = true, accessibilityLabel, testID, onChange, onValueChange }: MockSegmentedProps) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} testID={testID}>
      {values.map((value, i) => (
        <Pressable
          key={value}
          accessibilityRole="tab"
          accessibilityLabel={value}
          accessibilityState={{ selected: i === selectedIndex, disabled: !enabled }}
          disabled={!enabled}
          onPress={() => {
            onChange?.({ nativeEvent: { selectedSegmentIndex: i, value } });
            onValueChange?.(value);
          }}
        >
          <Text>{value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Tests change the value with fireEvent(picker, 'change', { type: 'set' }, date), as the native control reports it. */
export function MockDateTimePicker({ testID, accessibilityLabel, onChange }: { testID?: string; accessibilityLabel?: string; onChange?: (e: { type: string }, d?: Date) => void }) {
  const props = { accessible: true, testID, accessibilityLabel, onChange };
  return <View {...(props as object)} />;
}
