import { View } from 'react-native';
import { Avatar, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Hole, HoleResult, Player, PlayerId, PlayerRoundState } from '@/types';
import { totals } from '@/lib/scoring';
import { formatIndex, formatSigned, plural } from '@/lib/format';

export interface ScoreSummaryTableProps {
  players: Player[];
  holes: Hole[];
  results: HoleResult[];
  handicaps: Record<PlayerId, PlayerRoundState>;
}

/** PLAYER · GROSS · HCP · NET, one row per player with the handicap explained. */
export function ScoreSummaryTable({ players, holes, results, handicaps }: ScoreSummaryTableProps) {
  const { c, space } = useTheme();
  return (
    <Card padding="roomy">
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: c.dividerSoft }}>
        <Text step="overline" tone="tertiary" style={{ flex: 1 }}>
          Player
        </Text>
        <Col>
          <Text step="overline" tone="tertiary">
            Gross
          </Text>
        </Col>
        <Col>
          <Text step="overline" tone="tertiary">
            Hcp
          </Text>
        </Col>
        <Col>
          <Text step="overline" tone="tertiary" align="right">
            Net
          </Text>
        </Col>
      </View>
      {players.map((p, i) => {
        const hcp = handicaps[p.id];
        const gross = totals(results, holes, p.id, 'gross');
        const net = totals(results, holes, p.id, 'net', hcp);
        const h = hcp?.playingHandicap ?? 0;
        const detail =
          p.handicapIndex != null && h !== 0
            ? `Index ${formatIndex(p.handicapIndex)} · ${formatSigned(hcp?.courseHandicap ?? h)} course handicap · ${h < 0 ? `gives ${Math.abs(h)}` : plural(h, 'stroke')} received`
            : 'Scratch';
        return (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3], borderBottomWidth: i === players.length - 1 ? 0 : 1, borderBottomColor: c.dividerSoft }}>
            <Avatar name={p.name} index={i} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text step="bodyStrong" numberOfLines={1}>
                {p.name}
              </Text>
              <Text step="caption" tone="secondary" tabular={false}>
                {detail}
                {gross.holesPickedUp ? ` · picked up ${gross.holesPickedUp}×` : ''}
              </Text>
            </View>
            <Col>
              <Text step="score">{gross.strokes}</Text>
            </Col>
            <Col>
              <Text step="total" tone="positiveText">
                {formatSigned(-h)}
              </Text>
            </Col>
            <Col>
              <Text step="score" align="right">
                {net.strokes}
              </Text>
            </Col>
          </View>
        );
      })}
    </Card>
  );
}

function Col({ children }: { children: React.ReactNode }) {
  return <View style={{ width: 52, alignItems: 'center' }}>{children}</View>;
}
