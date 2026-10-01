import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface ScreenHeaderProps {
  /** Green uppercase line above the title ("THE LOCAL LOOP"). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right of the eyebrow/title block (rare). */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Every tab opens with this: eyebrow, 32pt bold title, one grey line. */
export function ScreenHeader({ eyebrow, title, subtitle, trailing, style }: ScreenHeaderProps) {
  const { space } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3] }, style]}>
      <View style={{ flex: 1, gap: 6 }}>
        {eyebrow ? (
          <Text step="eyebrow" tone="accent">
            {eyebrow}
          </Text>
        ) : null}
        <Text accessibilityRole="header" step="display">
          {title}
        </Text>
        {subtitle ? (
          <Text step="body" tone="tertiary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
