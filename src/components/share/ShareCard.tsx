import { forwardRef } from 'react';
import { View } from 'react-native';
import { ThemeScope, useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { BrandMark } from '@/components/BrandMark';
import { ContourField } from '@/components/ContourField';
import { ScoreTable } from '@/components/scorecard';
import { GameResultsList, type GameResult } from '@/components/round';
import type { Hole, PlayerId, PlayerRoundState, Round, ScoringBasis } from '@/types';
import { formatShortDate, joinMeta } from '@/lib/format';

export interface ShareCardProps {
  round: Round;
  holes: Hole[];
  handicaps: Record<PlayerId, PlayerRoundState>;
  results: GameResult[];
  basis?: ScoringBasis;
  completedAt?: string;
  /** Logical width; captured at the device scale (540 → 1080px at 2×). */
  width?: number;
}

/** The scorecard as an image: always the dark brand look, contour header, card, game results, no-money footer. */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard({ round, holes, handicaps, results, basis, completedAt, width = 540 }, ref) {
  return (
    <ThemeScope scheme="dark">
      <Body ref={ref} round={round} holes={holes} handicaps={handicaps} results={results} basis={basis} completedAt={completedAt} width={width} />
    </ThemeScope>
  );
});

const Body = forwardRef<View, Required<Pick<ShareCardProps, 'width'>> & ShareCardProps>(function Body({ round, holes, handicaps, results, basis, completedAt, width }, ref) {
  const { c, space } = useTheme();
  const anyHandicap = Object.values(handicaps).some((h) => h.playingHandicap !== 0);
  const tee = round.course.teeBoxes.find((t) => t.id === round.teeBoxId);
  return (
    <View ref={ref} collapsable={false} style={{ width, padding: space[8], gap: space[4], backgroundColor: c.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] }}>
        <ContourField style={{ top: -space[8], bottom: -space[2], left: -space[8], right: -space[8] }} />
        <BrandMark size={36} />
        <Text step="display" serif style={{ flex: 1 }}>
          Birdies{' '}
          <Text step="display" serif italic tone="accent">
            & Bets
          </Text>
        </Text>
        <Text step="label" tone="tertiary">
          {formatShortDate(completedAt ?? round.updatedAt)}
        </Text>
      </View>
      <View>
        <Text step="headline">{round.course.name}</Text>
        <Text step="body" tone="secondary">
          {joinMeta([tee ? `${tee.name} tees` : null, `${round.settings.holeCount} holes`, (basis ?? (anyHandicap ? 'net' : 'gross')) === 'net' ? 'Net scores' : 'Gross scores'])}
        </Text>
      </View>
      <ScoreTable holes={holes} players={round.players} results={round.holeResults} basis={basis ?? (anyHandicap ? 'net' : 'gross')} handicaps={handicaps} currentHole={0} />
      {results.length > 0 ? (
        <View style={{ gap: space[3] }}>
          <GameResultsList results={results} />
        </View>
      ) : null}
      <Text step="caption" tone="tertiary" tabular={false} align="center">
        Points are a tally between players. Birdies & Bets does not hold, move or request money.
      </Text>
    </View>
  );
});
