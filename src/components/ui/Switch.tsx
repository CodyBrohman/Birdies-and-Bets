import { Switch as RNSwitch } from 'react-native';
import { haptic, useTheme } from '@/theme';

export interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
}

/** The native iOS switch, pine when on. */
export function Switch({ value, onChange, accessibilityLabel, disabled, testID }: SwitchProps) {
  const { c } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={(v) => {
        haptic.selection();
        onChange(v);
      }}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      trackColor={{ false: c.tickUpcoming, true: c.accent }}
      ios_backgroundColor={c.tickUpcoming}
    />
  );
}
