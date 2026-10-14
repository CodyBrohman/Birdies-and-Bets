import { View } from 'react-native';
import { ListItem, Text } from '@/components/ui';
import { formatShortDate, formatToPar, joinMeta } from '@/lib/format';
import { findMe, formatNet, winnerOf, type Me, type RoundInsight } from '@/lib/stats';
import { stakeUnit } from '@/lib/history';

export interface RoundRowProps {
  insight: RoundInsight;
  /** The phone's owner, whose score is featured when they played. */
  me?: Me;
  onPress: () => void;
  menu?: { label: string; onPress: () => void; destructive?: boolean }[];
  /** Set by ListSection. */
  first?: boolean;
}

/**
 * One finished round in a list: the course, then the date, who won and the games; on the right your score (or the
 * leader's) with the points or the score to par under it.
 */
export function RoundRow({ insight, me, onPress, menu, first }: RoundRowProps) {
  const { summary } = insight;
  const mine = me ? findMe(insight, me) : undefined;
  const featured = mine ?? summary.players.find((p) => p.id === summary.leaderId) ?? summary.players[0];
  const net = featured ? insight.netByPlayer[featured.id] : undefined;
  // "Won" only for an outright winner of a round with games; otherwise who had the low score.
  const winner = summary.players.find((p) => p.id === winnerOf(summary));
  const anyStrokes = summary.players.some((p) => p.playingHandicap !== 0);
  const outcome = winner ? (summary.gameNames.length ? `${winner.name} won` : `${winner.name} low ${anyStrokes ? 'net' : 'gross'}`) : null;
  const showsPoints = net != null && net !== 0;
  const second = showsPoints ? `${formatNet(net!)} ${stakeUnit(insight.stakeLabel)}` : featured ? formatToPar(featured.grossToPar) : '';
  const subtitle = joinMeta([formatShortDate(summary.completedAt), outcome, ...summary.gameNames]);
  return (
    <ListItem
      title={summary.courseName}
      strong
      subtitle={subtitle}
      onPress={onPress}
      menu={menu}
      first={first}
      accessibilityLabel={joinMeta([summary.courseName, subtitle, featured ? `${mine ? 'you' : featured.name} ${featured.gross}, ${second}` : null])}
      trailing={
        featured ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text step="rowTitle" tabular>
              {featured.gross}
            </Text>
            <Text step="footnote" tone="secondary" tabular>
              {second}
            </Text>
          </View>
        ) : null
      }
    />
  );
}
