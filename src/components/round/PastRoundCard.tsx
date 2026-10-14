import { View } from 'react-native';
import { Card, IconTile, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { formatShortDate, formatToPar, joinMeta } from '@/lib/format';
import { findMe, formatNet, winnerOf, type Me, type RoundInsight } from '@/lib/stats';
import { stakeUnit } from '@/lib/history';

export interface PastRoundCardProps {
  insight: RoundInsight;
  /** The phone's owner, whose score is featured when they played. */
  me?: Me;
  onPress: () => void;
}

/** One finished round in a list: course, date, who won (only outright, with games), the featured gross and points. */
export function PastRoundCard({ insight, me, onPress }: PastRoundCardProps) {
  const { space } = useTheme();
  const { summary } = insight;
  const featured = (me && findMe(insight, me)) ?? summary.players.find((p) => p.id === summary.leaderId) ?? summary.players[0];
  const net = featured ? insight.netByPlayer[featured.id] : undefined;
  const unit = stakeUnit(insight.stakeLabel);
  // "Won" only for an outright winner of a round with games; otherwise just who had the low score.
  const winner = summary.players.find((p) => p.id === winnerOf(summary));
  const anyStrokes = summary.players.some((p) => p.playingHandicap !== 0);
  const outcome = winner ? (summary.gameNames.length ? `${winner.name} won` : `${winner.name} low ${anyStrokes ? 'net' : 'gross'}`) : null;
  const showsPoints = net != null && net !== 0;
  return (
    <Card accessibilityLabel={`${summary.courseName}, ${formatShortDate(summary.completedAt)}`} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
      <IconTile icon="flag-outline" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text step="title" numberOfLines={1}>
          {summary.courseName}
        </Text>
        <Text step="caption" tone="tertiary" tabular={false} numberOfLines={1}>
          {joinMeta([formatShortDate(summary.completedAt), outcome, ...summary.gameNames])}
        </Text>
      </View>
      {featured ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text step="total">{featured.gross}</Text>
          <Text step="caption" tone={showsPoints ? (net! > 0 ? 'accent' : 'secondary') : featured.grossToPar < 0 ? 'accent' : featured.grossToPar > 0 ? 'goldText' : 'tertiary'}>
            {showsPoints ? `${formatNet(net!)} ${unit}` : formatToPar(featured.grossToPar)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
