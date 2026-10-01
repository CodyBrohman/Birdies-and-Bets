import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { haptic, useTheme } from '@/theme';
import { Text, Pressable } from '@/components/ui';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface TabSpec {
  name: string;
  label: string;
  icon: IoniconName;
  iconActive: IoniconName;
}

export interface TabBarProps {
  tabs: TabSpec[];
  active: string;
  onPress: (name: string) => void;
}

/** Cream tab bar with a hairline top: outline icons, small labels, forest for the active tab (bold label). */
export function TabBar({ tabs, active, onPress }: TabBarProps) {
  const { c, f, space } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingHorizontal: space[2], paddingTop: 6, paddingBottom: Math.max(insets.bottom, space[2]), backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.divider }}>
      {tabs.map((tab) => {
        const on = tab.name === active;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic.selection();
              onPress(tab.name);
            }}
            style={({ pressed }) => ({ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name={on ? tab.iconActive : tab.icon} size={23} color={on ? c.textPrimary : c.textTertiary} />
            <Text step="tab" numberOfLines={1} style={{ color: on ? c.textPrimary : c.textTertiary, fontFamily: on ? f.uiBold : f.uiMedium }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
