import { View } from 'react-native';
import { BasisTag, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { GameMode, ScoringBasis, Standings } from '@/types';

export interface GameResult {
  mode: GameMode;
  standings: Standings;
}

/** A game's result as plain words: what a shared card link carries, and what the app shows. */
export interface GameResultText {
  key: string;
  name: string;
  /** Shown as a Net / Gross tag when the game can be played either way. */
  basis?: ScoringBasis;
  headline: string;
  lines: string[];
}

/** Each game's result: its name and basis, the sentence on who won, then every player's figure. */
export function GameResultsList({ results }: { results: GameResult[] }) {
  return <GameResultRows games={results.map(({ mode, standings }) => ({ key: mode.id, name: mode.name, basis: mode.supportsNet ? standings.basis : undefined, headline: standings.headline, lines: standings.lines.map((l) => l.text) }))} />;
}

export function GameResultRows({ games }: { games: GameResultText[] }) {
  const { c, space } = useTheme();
  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingHorizontal: space[4] }}>
      {games.map((g, i) => (
        <View
          key={g.key}
          accessible
          accessibilityLabel={[g.name, g.basis, g.headline, g.lines.join(', ')].filter(Boolean).join('. ')}
          style={{ paddingVertical: space[3], gap: 2, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Text step="footnote" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
              {g.name}
            </Text>
            {g.basis ? <BasisTag basis={g.basis} /> : null}
          </View>
          <Text step="rowTitle">{g.headline}</Text>
          {g.lines.map((line, j) => (
            <Text key={j} step="subhead" tone="secondary">
              {line}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
