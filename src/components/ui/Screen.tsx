import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface ScreenProps extends ViewProps {
  /** Skip bottom inset (e.g. when a tab bar or footer already handles it). */
  noBottomInset?: boolean;
}

/** Screen ground with safe-area padding and the 16pt gutter. */
export function Screen({ style, noBottomInset, children, ...rest }: ScreenProps) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      {...rest}
      style={[
        {
          flex: 1,
          backgroundColor: c.surface,
          paddingTop: insets.top,
          paddingBottom: noBottomInset ? 0 : insets.bottom,
          paddingLeft: Math.max(insets.left, space[4]),
          paddingRight: Math.max(insets.right, space[4]),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
