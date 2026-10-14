import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic, useTheme } from '@/theme';
import { Icon, Pressable, Text, type IconName } from '@/components/ui';

export interface TabSpec {
  /** The route group, e.g. "(home)". */
  name: string;
  label: string;
  icon: IconName;
  testID: string;
}

export interface TabBarProps {
  tabs: TabSpec[];
  active: string;
  onPress: (name: string) => void;
}

/**
 * Web preview only: a stand-in for the native iOS tab bar (the app uses NativeTabs). White bar with a hairline, the
 * same symbols filled when selected, pine for the selected tab.
 */
export function TabBar({ tabs, active, onPress }: TabBarProps) {
  const { c, w, space } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingTop: 6, paddingBottom: Math.max(insets.bottom, space[2]), backgroundColor: c.surfaceRaised, borderTopWidth: 1, borderTopColor: c.divider }}>
      {tabs.map((tab) => {
        const on = tab.name === active;
        const tint = on ? c.accent : c.textTertiary;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            testID={tab.testID}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic.selection();
              onPress(tab.name);
            }}
            style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name={tab.icon} filled={on} size={26} color={tint} />
            <Text step="caption2" numberOfLines={1} style={{ color: tint, fontWeight: w.medium }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
