import { Pressable, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Small word under the value, e.g. "Birdie". */
  caption?: string;
  /** Color the value and caption: under par positive, over par negative. */
  tone?: 'primary' | 'positive' | 'negative';
  accessibilityLabel?: string;
}

/**
 * The score control. 56×60pt buttons, 60pt value column, radius 10.
 * Glove-friendly; haptic on every step so a tap registers without looking.
 */
export function Stepper({ value, onChange, min = 1, max = 20, caption, tone = 'primary', accessibilityLabel }: StepperProps) {
  const { c, hit, radius } = useTheme();
  const atMin = value <= min;
  const atMax = value >= max;

  const step = (delta: number) => {
    const next = value + delta;
    if (next < min || next > max) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange(next);
  };

  const buttonStyle = (pressed: boolean, disabled: boolean): ViewStyle => ({
    width: hit.scoreEntry,
    height: hit.scoreEntryHeight,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: pressed ? c.accent : c.divider,
    backgroundColor: pressed ? c.accentTint : c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: value, min, max, text: caption ? `${value}, ${caption}` : String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <Pressable disabled={atMin} onPress={() => step(-1)} style={({ pressed }) => buttonStyle(pressed, atMin)}>
        <Text step="score" tone="primary" style={{ lineHeight: 36 }}>
          −
        </Text>
      </Pressable>
      <View style={{ width: hit.scoreEntryHeight, alignItems: 'center', justifyContent: 'center' }}>
        <Text step="score" tone={tone}>
          {value}
        </Text>
        {caption ? (
          <Text step="tab" tone={tone} style={{ marginTop: -2 }}>
            {caption}
          </Text>
        ) : null}
      </View>
      <Pressable disabled={atMax} onPress={() => step(1)} style={({ pressed }) => buttonStyle(pressed, atMax)}>
        <Text step="score" tone="primary" style={{ lineHeight: 36 }}>
          +
        </Text>
      </Pressable>
    </View>
  );
}
