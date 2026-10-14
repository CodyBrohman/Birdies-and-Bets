import RNSegmentedControl from '@react-native-segmented-control/segmented-control';
import type { StyleProp, ViewStyle } from 'react-native';
import { haptic, useTheme } from '@/theme';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** The native iOS segmented control (Gross / Net, 18 / Front 9 / Back 9). */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, testID, style }: SegmentedControlProps<T>) {
  const { c, w } = useTheme();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <RNSegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={selectedIndex}
      onChange={(e) => {
        const next = options[e.nativeEvent.selectedSegmentIndex];
        if (!next || next.value === value) return;
        haptic.selection();
        onChange(next.value);
      }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      appearance="light"
      backgroundColor={c.surfaceRaised2}
      tintColor={c.surfaceRaised}
      fontStyle={{ color: c.textSecondary, fontSize: 14 }}
      activeFontStyle={{ color: c.textPrimary, fontSize: 14, fontWeight: w.semibold }}
      style={[{ minHeight: 34 }, style]}
    />
  );
}
