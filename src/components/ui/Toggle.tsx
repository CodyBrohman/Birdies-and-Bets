import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { useReduceMotion, useTheme } from '@/theme';

export interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

const TRACK_W = 64;
const TRACK_H = 38;
const KNOB = 30;

/** 64×38 pill; accent when on, divider when off; 30pt surfaceRaised knob. Respects Reduce Motion. */
export function Toggle({ value, onChange, accessibilityLabel, disabled }: ToggleProps) {
  const { c, motion } = useTheme();
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
        borderRadius: 999,
        backgroundColor: value ? c.accent : c.divider,
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Animated.View
        style={{
          width: KNOB,
          height: KNOB,
          borderRadius: 999,
          backgroundColor: c.surfaceRaised,
          transform: [{ translateX }],
        }}
      />
    </Pressable>
  );
}
