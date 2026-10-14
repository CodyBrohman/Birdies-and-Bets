import { View } from 'react-native';
import { BasisTag, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { GameMode, Standings } from '@/types';

export interface GameResult {
  mode: GameMode;
  standings: Standings;
}

/** Each game's result: its name and basis, the sentence on who won, then every player's figure. */
export function GameResultsList({ results }: { results: GameResult[] }) {
  const { c, space } = useTheme();
  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingHorizontal: space[4] }}>
      {results.map(({ mode, standings }, i) => (
        <View
          key={mode.id}
          accessible
          accessibilityLabel={[mode.name, mode.supportsNet ? standings.basis : null, standings.headline, standings.lines.map((l) => l.text).join(', ')].filter(Boolean).join('. ')}
          style={{ paddingVertical: space[3], gap: 2, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Text step="footnote" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
              {mode.name}
            </Text>
            {mode.supportsNet ? <BasisTag basis={standings.basis} /> : null}
          </View>
          <Text step="rowTitle">{standings.headline}</Text>
          {standings.lines.map((l, j) => (
            <Text key={l.playerId ?? j} step="subhead" tone="secondary">
              {l.text}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
