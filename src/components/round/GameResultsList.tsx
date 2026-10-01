import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { GameMode, Standings } from '@/types';

export interface GameResult {
  mode: GameMode;
  standings: Standings;
}

/** One outlined card per game: category dot, name, basis badge, headline and lines. */
export function GameResultsList({ results }: { results: GameResult[] }) {
  const { c, space } = useTheme();
  return (
    <>
      {results.map(({ mode, standings }) => (
        <Card key={mode.id} variant="outlined" padding="roomy">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: mode.category === 'betting' ? c.accent : c.gold }} />
            <Text step="headline" style={{ flexShrink: 1 }} numberOfLines={1}>
              {mode.name}
            </Text>
            {mode.supportsNet ? <Badge label={standings.basis} tone={standings.basis === 'net' ? 'net' : 'gross'} /> : null}
          </View>
          <Text step="body" tone="secondary" style={{ marginTop: space[2] }}>
            {standings.headline}
            {standings.lines.length > 0 ? `\n${standings.lines.map((l) => l.text).join(' · ')}` : ''}
          </Text>
        </Card>
      ))}
    </>
  );
}
