import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/** A link to somewhere that does not exist (an old or mistyped deep link): say so plainly and offer a way home. */
export default function NotFoundScreen() {
  const router = useRouter();
  const { space } = useTheme();
  return (
    <Screen style={{ justifyContent: 'center', gap: space[4] }}>
      <View style={{ gap: space[1] }}>
        <Text accessibilityRole="header" step="title2" align="center">
          Page not found
        </Text>
        <Text step="rowBody" tone="secondary" align="center">
          That link doesn&apos;t lead anywhere in Birdies & Bets.
        </Text>
      </View>
      <Button label="Go to Home" variant="secondary" onPress={() => router.replace('/' as Href)} />
    </Screen>
  );
}
