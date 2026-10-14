import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { joinMeta } from '@/lib/format';
import type { LiveRoundSummary } from '@/store';

/**
 * The round in progress, on Home: the app's one dark surface. The course; "Hole 7 · You +3 thru 6"; the first game's
 * line; then Resume round.
 */
export function LiveRoundCard({ live, onResume }: { live: LiveRoundSummary; onResume: () => void }) {
  const { c, w, space } = useTheme();
  return (
    <View style={{ backgroundColor: c.hero, borderRadius: 22, padding: space[5], gap: space[4] }}>
      <View accessible accessibilityLabel={joinMeta(['Round in progress', live.courseName, `hole ${live.hole}`, live.scoreLine, live.gameLine])} style={{ gap: space[1] }}>
        <Text step="footnote" style={{ color: c.onHeroSoft }}>
          Round in progress
        </Text>
        <Text step="title2" style={{ color: c.onHero }} numberOfLines={2}>
          {live.courseName}
        </Text>
        <Text step="callout" tabular style={{ color: c.onHero, fontWeight: w.semibold }} numberOfLines={1}>
          {joinMeta([`Hole ${live.hole}`, live.scoreLine])}
        </Text>
        {live.gameLine ? (
          <Text step="subhead" style={{ color: c.onHeroSoft }} numberOfLines={2}>
            {live.gameLine}
          </Text>
        ) : null}
      </View>
      <Button label="Resume round" variant="hero" onPress={onResume} testID="resume-round" />
    </View>
  );
}
