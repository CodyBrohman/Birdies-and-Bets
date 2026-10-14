import type { ReactNode, RefObject } from 'react';
import { Platform, ScrollView, View, useWindowDimensions, type ScrollViewProps } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gutter, useTheme } from '@/theme';
import { Text } from './Text';

export interface ScrollScreenProps extends Omit<ScrollViewProps, 'children' | 'contentContainerStyle'> {
  /** The native header title. */
  title: string;
  /** A tab root: an iOS large title that collapses into the bar as you scroll. */
  largeTitle?: boolean;
  /** Buttons in the header bar (Share, +). Keep them to icons with labels, or one short word. */
  headerRight?: () => ReactNode;
  headerLeft?: () => ReactNode;
  /** A custom title view (two lines: "Hole 7" over "Par 4 · 385 yds"). The plain `title` still names the screen. */
  headerTitle?: () => ReactNode;
  /** Pinned under the content, above the tab bar or home indicator: the screen's one primary button. */
  footer?: ReactNode;
  /** For scrolling back to the top (the live round does on Next). */
  scrollRef?: RefObject<ScrollView | null>;
  /** Space between the direct children. Defaults to the section rhythm (28). */
  gap?: number;
  children: ReactNode;
}

/**
 * A screen in a stack: the native header (large title on tab roots) and one scroll view as the first child, so iOS
 * insets the content under the bars, collapses the large title on scroll and lifts content over the keyboard. On the
 * web preview the large title is drawn at the top of the content instead (the web header has no large title).
 */
export function ScrollScreen({ title, largeTitle, headerRight, headerLeft, headerTitle, footer, scrollRef, gap, children, ...scroll }: ScrollScreenProps) {
  const { c, space, layout } = useTheme();
  const { width } = useWindowDimensions();
  const side = width >= gutter.wideFrom ? gutter.wide : gutter.phone;
  const webLarge = Platform.OS === 'web' && largeTitle;
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ headerShown: !webLarge, title, headerLargeTitle: !!largeTitle, headerRight, headerLeft, ...(headerTitle ? { headerTitle } : null) }} />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        {...scroll}
        style={{ flex: 1, backgroundColor: c.surface }}
        contentContainerStyle={{ paddingHorizontal: side, paddingTop: webLarge ? space[4] : space[2], paddingBottom: layout.section, gap: gap ?? layout.section }}
      >
        {webLarge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: -space[2] }}>
            <Text accessibilityRole="header" step="largeTitle" style={{ flex: 1 }} numberOfLines={1}>
              {title}
            </Text>
            {headerRight?.()}
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? (
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.divider }}>
          <View style={{ paddingHorizontal: side, paddingTop: space[3], paddingBottom: space[3], gap: space[2] }}>{footer}</View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}
