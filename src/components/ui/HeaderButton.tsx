import { PRESSED_OPACITY, useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface HeaderButtonProps {
  /** The word shown ("Close", "Save"), or the VoiceOver name when an icon is given. */
  label: string;
  icon?: IconName;
  onPress: () => void;
  /** Bold, for the action that completes a sheet ("Save", "Done"). */
  prominent?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** A navigation bar button: a short word in pine, or an icon with a spoken name. 44pt target. */
export function HeaderButton({ label, icon, onPress, prominent, disabled, testID }: HeaderButtonProps) {
  const { c, w } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => ({ minWidth: 44, minHeight: 44, paddingHorizontal: icon ? 0 : 4, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? PRESSED_OPACITY : 1 })}
    >
      {icon ? (
        <Icon name={icon} color={c.accent} />
      ) : (
        <Text step="rowBody" style={{ color: c.accent, fontWeight: prominent ? w.semibold : w.regular }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
