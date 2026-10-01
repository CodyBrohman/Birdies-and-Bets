import { Tabs } from 'expo-router';
import { useTheme } from '@/theme';
import { TabBar, type TabSpec } from '@/components/AppTabBar';

const TABS: TabSpec[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home-outline' },
  { name: 'courses', label: 'Courses', icon: 'map-outline', iconActive: 'map-outline' },
  { name: 'bet', label: 'Bet', icon: 'flag-outline', iconActive: 'flag-outline' },
  { name: 'friends', label: 'Friends', icon: 'people-outline', iconActive: 'people-outline' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person-outline' },
];

/** App-wide tabs: Home · Courses · Bet · Friends · Profile. A live round opens as its own full-screen stack. */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      tabBar={({ state, navigation }) => (
        <TabBar
          tabs={TABS}
          active={state.routes[state.index]?.name ?? 'index'}
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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
      <Tabs.Screen name="bet" options={{ title: 'Bet' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
