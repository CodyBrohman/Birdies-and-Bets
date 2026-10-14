import { useRouter, type Href } from 'expo-router';
import { Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';

/** A link to somewhere that does not exist (an old or mistyped deep link): say so plainly and offer a way home. */
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState fill icon="help-circle-outline" title="Page not found" body="That link doesn't lead anywhere in Birdies & Bets." action={{ label: 'Go to Home', onPress: () => router.replace('/' as Href) }} />
    </Screen>
  );
}
