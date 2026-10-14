import { Tabs } from 'expo-router';
import { useTheme } from '@/theme';
import { TabBar, type TabSpec } from '@/components/AppTabBar';

const TABS: TabSpec[] = [
  { name: '(home)', label: 'Home', icon: 'home', testID: 'tab-home' },
  { name: '(courses)', label: 'Courses', icon: 'courses', testID: 'tab-courses' },
  { name: '(play)', label: 'Play', icon: 'play', testID: 'tab-play' },
  { name: '(friends)', label: 'Friends', icon: 'friends', testID: 'tab-friends' },
  { name: '(profile)', label: 'Profile', icon: 'profile', testID: 'tab-profile' },
];

/** Web preview: JS tabs with a stand-in for the native tab bar (NativeTabs on the web is a floating pill at the top). */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      tabBar={({ state, navigation }) => (
        <TabBar
          tabs={TABS}
          active={state.routes[state.index]?.name ?? '(home)'}
          onPress={(name) => {
            const route = state.routes.find((r) => r.name === name);
            if (!route) return;
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (state.routes[state.index]?.name !== name && !event.defaultPrevented) navigation.navigate(route.name);
          }}
        />
      )}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.surface } }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}
