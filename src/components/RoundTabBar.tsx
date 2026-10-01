import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabBar, type TabSpec } from './AppTabBar';

const TABS: TabSpec[] = [
  { name: 'play', label: 'Hole', icon: 'golf-outline', iconActive: 'golf' },
  { name: 'card', label: 'Card', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'standings', label: 'Games', icon: 'trophy-outline', iconActive: 'trophy' },
];

/** The round's tabs: Hole · Card · Games, in the same icon-and-label bar as the rest of the app. Hidden on the summary. */
export function RoundTabBar({ state, navigation }: BottomTabBarProps) {
  const focused = state.routes[state.index]?.name;
  if (focused === 'summary') return null;
  return (
    <TabBar
      tabs={TABS}
      active={focused ?? 'play'}
      onPress={(name) => {
        const route = state.routes.find((r: { name: string; key: string }) => r.name === name);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (focused !== name && !event.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}
