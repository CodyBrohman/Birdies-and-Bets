import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from './Pressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { haptic, useTheme } from '@/theme';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered before the number, e.g. "$". */
  prefix?: string;
  /** Rendered after the number, e.g. "pts". */
  suffix?: string;
  /** Format the shown value (e.g. one decimal for a handicap index). */
  format?: (value: number) => string;
  /** Replaces the value text (e.g. an input so the number can be typed). */
  center?: ReactNode;
  accessibilityLabel?: string;
}

/** The `− 14.2 +` control from the profile mockup: recessed rounded-square buttons either side of a bold value. */
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, prefix, suffix, format, center, accessibilityLabel }: StepperProps) {
  const { c } = useTheme();
  const atMin = value <= min;
  const atMax = value >= max;
  const go = (delta: number) => {
    // Round to the step's precision so 0.1 steps don't drift (14.200000001).
    const next = Math.round(Math.max(min, Math.min(max, value + delta)) * 100) / 100;
    if (next === value) return;
    haptic.light();
    onChange(next);
  };
  const shown = `${prefix ?? ''}${format ? format(value) : value}${suffix ? ` ${suffix}` : ''}`;
  const side = (icon: 'remove' | 'add', delta: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel ?? 'Value'} ${delta > 0 ? 'up' : 'down'}`}
      disabled={disabled}
      onPress={() => go(delta)}
      hitSlop={8}
      style={({ pressed }) => ({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: pressed ? c.dividerSoft : c.neutralChip, opacity: disabled ? 0.35 : 1 })}
    >
      <Ionicons name={icon} size={18} color={c.textPrimary} />
    </Pressable>
  );
  return (
    <View
      accessible={!center}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: value, min, max, text: shown }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? step : -step)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 }}
    >
      {side('remove', -step, atMin)}
      <View style={{ minWidth: 52, alignItems: 'center' }}>
        {center ?? (
          <Text step="title" tabular numberOfLines={1} style={{ fontSize: 17 }}>
            {shown}
          </Text>
        )}
      </View>
      {side('add', step, atMax)}
    </View>
  );
}
