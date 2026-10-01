import { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion, useTheme } from '@/theme';
import { Text } from './Text';

export interface LivePillProps {
  label: string;
  /** Pulse the dot (a round in progress). Static under Reduce Motion. */
  live?: boolean;
  tone?: 'accent' | 'gold' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

/** "LIVE · HOLE 12 OF 18": tinted pill with a bordered edge and a dot that breathes. */
export function LivePill({ label, live, tone = 'accent', style }: LivePillProps) {
  const { c, radius, space } = useTheme();
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!live || reduce) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, reduce, pulse]);

  const p = tone === 'gold' ? { bg: c.goldTint, fg: c.goldTintText, dot: c.gold, border: c.goldBorder } : tone === 'neutral' ? { bg: c.neutralChip, fg: c.neutralChipText, dot: c.textTertiary, border: c.divider } : { bg: c.accentTint, fg: c.accentTintText, dot: c.accent, border: c.accentBorder };
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: space[3], paddingVertical: 5, borderRadius: radius.pill, backgroundColor: p.bg, borderWidth: 0 }, style]}>
      <Animated.View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: p.dot, opacity: pulse }} />
      <Text step="overline" style={{ color: p.fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
