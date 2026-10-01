import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/** Friends tab: the list, and a friend's detail pushed over it. */
export default function FriendsLayout() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface } }} />;
}
