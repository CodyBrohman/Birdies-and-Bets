import { View } from 'react-native';
import { Pressable } from './Pressable';
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
  /** 40pt track for inline use inside cards; default is 48. */
  compact?: boolean;
}

/** Recessed pill track; the selected segment is a warm white thumb with a soft shadow. */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel, compact }: SegmentedProps<T>) {
  const { c, e, radius } = useTheme();
  const height = compact ? 44 : 52;
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', minHeight: height, padding: 4, borderRadius: radius.pill, backgroundColor: c.surfaceRaised2, flexShrink: 0 }}
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
              minWidth: compact ? 68 : 80,
              paddingHorizontal: compact ? 12 : 16,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: on ? c.surfaceRaised : pressed ? c.hover : 'transparent',
              ...(on ? e.lifted : null),
            })}
          >
            <Text step={compact ? 'label' : 'bodyStrong'} tone={on ? 'primary' : 'secondary'} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
