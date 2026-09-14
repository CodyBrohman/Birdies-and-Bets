import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** 44pt, 1.5px divider border, radius 10. Selected segment is a textPrimary fill with surface-colored text. */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  const { c, hit, radius } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        height: hit.min,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: c.divider,
        backgroundColor: c.surfaceRaised,
        overflow: 'hidden',
      }}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.textPrimary : pressed ? c.accentTint : 'transparent',
            })}
          >
            <Text step="label" style={{ color: on ? c.surface : c.textPrimary }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
