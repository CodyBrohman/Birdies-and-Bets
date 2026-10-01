import { View, useWindowDimensions, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gutter, useTheme } from '@/theme';

export interface ScreenProps extends ViewProps {
  /** Skip bottom inset (e.g. when a tab bar or footer already handles it). */
  noBottomInset?: boolean;
}

/** Screen ground with safe-area padding and the site's gutter: 16pt on phones, 32pt from tablet width. */
export function Screen({ style, noBottomInset, children, ...rest }: ScreenProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = width >= gutter.wideFrom ? gutter.wide : gutter.phone;
  return (
    <View
      {...rest}
      style={[
        {
          flex: 1,
          backgroundColor: c.surface,
          paddingTop: insets.top,
          paddingBottom: noBottomInset ? 0 : insets.bottom,
          paddingLeft: Math.max(insets.left, side),
          paddingRight: Math.max(insets.right, side),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
