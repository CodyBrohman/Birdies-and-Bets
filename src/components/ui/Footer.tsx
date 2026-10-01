import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface FooterProps extends ViewProps {
  /** One centred helper line above the action ("Add two names to continue"). */
  hint?: string;
}

/** Pinned footer under a scroll view: optional hint line, then the full-width action. 12pt above, safe-area (min 16pt) below. */
export function Footer({ hint, style, children, ...rest }: FooterProps) {
  const { space } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View {...rest} style={[{ paddingTop: space[3], paddingBottom: Math.max(insets.bottom, space[4]), gap: space[2] }, style]}>
      {hint ? (
        <Text step="caption" tone="secondary" tabular={false} align="center" numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
