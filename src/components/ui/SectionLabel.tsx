import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface SectionLabelProps {
  children: string;
  /** Leading 8pt dot: pine for betting games, gold for the social ones. ('positive' is kept as an alias of gold.) */
  dot?: 'accent' | 'gold' | 'positive';
  /** One quiet line under the title ("Pick a friendly wager or keep it just for fun."). */
  sub?: string;
  /** Right-aligned slot: a count or a custom control. */
  trailing?: ReactNode;
  /** Shorthand for a pine text link at the right ("See friends", "Invite friends"). */
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

/** Section title from the mockups: 21pt bold forest ("Bring your crew"), an optional link at the right and a sub line. */
export function SectionLabel({ children, dot, sub, trailing, action, style }: SectionLabelProps) {
  const { c, f, space } = useTheme();
  return (
    <View style={[{ gap: 2 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {dot ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: dot === 'accent' ? c.accent : c.goldFill }} /> : null}
        <Text accessibilityRole="header" step="headline" style={{ flex: 1 }}>
          {children}
        </Text>
        {trailing}
        {action ? (
          <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text step="label" tone="accent" style={{ fontFamily: f.uiBold }}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {sub ? (
        <Text step="caption" tone="secondary" tabular={false}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
