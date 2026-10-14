import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SegmentedControl, Text } from '@/components/ui';
import { NineCard } from '@/components/scorecard';
import { useTheme } from '@/theme';
import type { Hole, PlayerId, PlayerRoundState, Round, ScoringBasis } from '@/types';
import type { NettedSettlement } from '@/lib/settlement';
import { resultHeadline, resultRows } from '@/lib/history';
import { backNine, frontNine } from '@/lib/scoring';
import { formatStake } from '@/lib/format';
import { GameResultsList, type GameResult } from './GameResultsList';
import { HoleNotesList } from './HoleNotesList';
import { PointsList } from './PointsList';
import { ResultCallout } from './ResultCallout';
import { ResultsTable } from './ResultsTable';

export interface RoundReportProps {
  round: Round;
  /** Holes in play, card order. */
  holes: Hole[];
  /** Holes in play order (notes are listed in it). */
  order: Hole[];
  handicaps: Record<PlayerId, PlayerRoundState>;
  results: GameResult[];
  netted: NettedSettlement;
  /** The hole-by-hole card, Gross or Net (a saved round's page shows it; Results has Back to the scorecard instead). */
  showScorecard?: boolean;
}

/**
 * A round's results, the same on Results and on a saved round's page: who won, Player · Gross · Net · Pts, the
 * scorecard, each game, the points tally and the notes.
 */
export function RoundReport({ round, holes, order, handicaps, results, netted, showScorecard }: RoundReportProps) {
  const { space } = useTheme();
  const rows = resultRows(round, holes, handicaps, netted);
  const useNet = rows.some((r) => r.playingHandicap !== 0);
  const [basis, setBasis] = useState<ScoringBasis>(useNet ? 'net' : 'gross');
  const pointsGames = results.filter((r) => r.mode.category === 'betting');
  const headline = resultHeadline(rows, useNet);
  const pointsLeader = [...rows].sort((a, b) => b.points - a.points)[0];
  const extra = pointsLeader && pointsLeader.points > 0 ? `Most points: ${pointsLeader.name} ${formatStake(`+${pointsLeader.points}`, round.settings.stakeLabel)}` : null;
  const front = frontNine(holes);
  const back = backNine(holes);

  return (
    <>
      <ResultCallout title={headline.title} detail={headline.detail} extra={extra} />
      <ResultsTable rows={rows} showNet={useNet} showPoints={pointsGames.length > 0} />

      {showScorecard ? (
        <Section
          title="Scorecard"
          trailing={
            useNet ? (
              <SegmentedControl
                accessibilityLabel="Scores shown"
                options={[
                  { value: 'gross', label: 'Gross' },
                  { value: 'net', label: 'Net' },
                ]}
                value={basis}
                onChange={setBasis}
                style={{ width: 150 }}
              />
            ) : null
          }
        >
          <View style={{ gap: space[3] }}>
            {front.length > 0 ? <NineCard label="Out" holes={front} players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} /> : null}
            {back.length > 0 ? <NineCard label="In" holes={back} players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} totalOver={front.length > 0 ? holes : undefined} /> : null}
          </View>
        </Section>
      ) : null}

      {results.length > 0 ? (
        <Section title="Games">
          <GameResultsList results={results} />
        </Section>
      ) : null}

      {pointsGames.length > 0 ? (
        <Section title="Points">
          <PointsList netted={netted} players={round.players} stakeLabel={round.settings.stakeLabel} />
        </Section>
      ) : null}

      <Section title="Notes">
        <HoleNotesList results={round.holeResults} order={order} />
      </Section>
    </>
  );
}

function Section({ title, trailing, children }: { title: string; trailing?: ReactNode; children: ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Text accessibilityRole="header" step="title3" style={{ flex: 1 }}>
          {title}
        </Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}
