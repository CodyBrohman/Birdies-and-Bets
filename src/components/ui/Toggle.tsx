import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { Pressable } from './Pressable';
import { useReduceMotion, useTheme } from '@/theme';

export interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

const TRACK_W = 52;
const TRACK_H = 32;
const KNOB = 26;

/** 64×38 pill; accent when on, upcoming-tick grey when off; ground-colour knob. Respects Reduce Motion. */
export function Toggle({ value, onChange, accessibilityLabel, disabled }: ToggleProps) {
  const { c, motion, radius } = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  const reduce = useReduceMotion();

  useEffect(() => {
    if (reduce) x.setValue(value ? 1 : 0);
    else Animated.timing(x, { toValue: value ? 1 : 0, duration: motion.toggle, useNativeDriver: true }).start();
  }, [value, x, motion.toggle, reduce]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [4, TRACK_W - KNOB - 4] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={6}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: radius.pill,
        backgroundColor: value ? c.accent : c.tickUpcoming,
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        ...(Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'pointer' } as object) : null),
      }}
    >
      <Animated.View style={{ width: KNOB, height: KNOB, borderRadius: radius.pill, backgroundColor: c.onAccent, transform: [{ translateX }] }} />
    </Pressable>
  );
}
