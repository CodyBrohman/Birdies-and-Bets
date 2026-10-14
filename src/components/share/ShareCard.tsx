import { forwardRef } from 'react';
import { View } from 'react-native';
import { seatColors, useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { Wordmark } from '@/components/BrandMark';
import { ContourField } from '@/components/ContourField';
import type { GameResult } from '@/components/round';
import type { Hole, PlayerId, PlayerRoundState, Round, ScoringBasis } from '@/types';
import type { NettedSettlement } from '@/lib/settlement';
import { netSettlements } from '@/lib/settlement';
import { resultHeadline, resultRows } from '@/lib/history';
import { backNine, frontNine, totals } from '@/lib/scoring';
import { formatShortDate, formatSigned, joinMeta, plural } from '@/lib/format';

export interface ShareCardProps {
  round: Round;
  holes: Hole[];
  handicaps: Record<PlayerId, PlayerRoundState>;
  results: GameResult[];
  /** The points tally, for the Pts column (left out when the round had no points games). */
  netted?: NettedSettlement;
  basis?: ScoringBasis;
  completedAt?: string;
}

/** 540 × 675 points, captured at 2× as a 1080 × 1350 image: the 4:5 shape chat apps show whole. */
export const SHARE_CARD_SIZE = { width: 540, height: 675 } as const;

/**
 * A round's result as an image for the group chat: the wordmark, course, date and tees, who won, then Player · Out · In
 * · Gross · Net · Pts, the games in a line each, and where to see the full card. Rendered off-screen and captured.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard({ round, holes, handicaps, results, netted, completedAt }, ref) {
  const { c, w, space } = useTheme();
  const tally = netted ?? netSettlements([], round.players.map((p) => p.id));
  const rows = resultRows(round, holes, handicaps, tally);
  const useNet = rows.some((r) => r.playingHandicap !== 0);
  const showPoints = results.some((r) => r.mode.category === 'betting');
  const headline = resultHeadline(rows, useNet);
  const tee = round.course.teeBoxes.find((t) => t.id === round.teeBoxId);
  const front = frontNine(holes);
  const back = backNine(holes);
  const nine = (p: PlayerId, set: Hole[]) => {
    const t = totals(round.holeResults, set, p, 'gross');
    return t.holesScored ? String(t.strokes) : '–';
  };
  const columns = [...(front.length && back.length ? ['Out', 'In'] : []), 'Gross', ...(useNet ? ['Net'] : []), ...(showPoints ? ['Pts'] : [])];
  const COL = 58;

  return (
    <View ref={ref} collapsable={false} style={{ ...SHARE_CARD_SIZE, padding: space[8], backgroundColor: c.surface, justifyContent: 'space-between' }}>
      <View style={{ gap: space[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ContourField style={{ top: -space[8], bottom: -space[4], left: -space[8], right: -space[8] }} />
          <Wordmark />
          <Text step="subhead" tone="secondary">
            {formatShortDate(completedAt ?? round.updatedAt)}
          </Text>
        </View>

        <View style={{ gap: 2 }}>
          <Text step="title1" numberOfLines={2}>
            {round.course.name}
          </Text>
          <Text step="callout" tone="secondary">
            {joinMeta([tee ? `${tee.name} tees` : null, plural(holes.length, 'hole'), useNet ? 'Net and gross' : 'Gross'])}
          </Text>
        </View>

        <View style={{ padding: space[4], borderRadius: 14, backgroundColor: c.accentTint, gap: 2 }}>
          <Text step="title2" style={{ color: c.accentTintText }}>
            {headline.title}
          </Text>
          {headline.detail ? (
            <Text step="callout" tabular style={{ color: c.accentTintText }}>
              {headline.detail}
            </Text>
          ) : null}
        </View>

        <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingHorizontal: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 34 }}>
            <Text step="tableHeader" tone="tertiary" style={{ flex: 1 }}>
              Player
            </Text>
            {columns.map((col) => (
              <Text key={col} step="tableHeader" tone="tertiary" align="right" style={{ width: COL }}>
                {col}
              </Text>
            ))}
          </View>
          {rows.map((r, i) => {
            const cells = [
              ...(front.length && back.length ? [nine(r.id, front), nine(r.id, back)] : []),
              r.holesScored ? String(r.gross) : '–',
              ...(useNet ? [r.holesScored ? String(r.net) : '–'] : []),
              ...(showPoints ? [r.points > 0 ? `+${r.points}` : formatSigned(r.points)] : []),
            ];
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, borderTopWidth: 1, borderTopColor: c.divider }}>
                <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: seatColors[i % seatColors.length]!.fill }} />
                  <Text step="rowTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {r.name}
                  </Text>
                </View>
                {cells.map((v, j) => (
                  <Text key={j} step="rowBody" tabular align="right" style={{ width: COL, fontWeight: columns[j] === 'Gross' || columns[j] === 'Pts' ? w.semibold : w.regular }}>
                    {v}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>

        {results.length > 0 ? (
          <View style={{ gap: 4 }}>
            {results.slice(0, 3).map((g) => (
              <Text key={g.mode.id} step="subhead" numberOfLines={1}>
                <Text step="subhead" style={{ fontWeight: w.semibold }}>{`${g.mode.name}: `}</Text>
                {g.standings.headline}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: space[3] }}>
        <Text step="footnote" tone="secondary">
          Full card: birdiesandbets.com/card
        </Text>
        <Text step="footnote" tone="tertiary" align="right" style={{ flexShrink: 1 }}>
          Points only. Nothing is paid in the app.
        </Text>
      </View>
    </View>
  );
});
