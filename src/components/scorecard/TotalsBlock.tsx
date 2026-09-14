import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { Hole, HoleResult, Player, PlayerId, PlayerRoundState, ScoringBasis } from '@/types';
import { backNine, frontNine, totals } from '@/lib/scoring';
import { formatSigned, formatToPar } from '@/lib/format';

export interface TotalsBlockProps {
  holes: Hole[];
  players: Player[];
  results: HoleResult[];
  basis: ScoringBasis;
  handicaps: Record<PlayerId, PlayerRoundState>;
}

const NUM_COL = 64;

/** Name + strokes, Out, In, Tot with to-par coloring. */
export function TotalsBlock({ holes, players, results, basis, handicaps }: TotalsBlockProps) {
  const { c, radius } = useTheme();
  const front = frontNine(holes);
  const back = backNine(holes);
  const nineHole = back.length === 0;

  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', height: 26, backgroundColor: c.gridHeader, alignItems: 'center', paddingLeft: 10 }}>
        <Text step="caption" style={{ color: c.gridHeaderText, flex: 1 }}>
          Total · {basis}
        </Text>
        <Head>Out</Head>
        {!nineHole ? <Head>In</Head> : null}
        <Head>Tot</Head>
      </View>
      {players.map((p) => {
        const hcp = handicaps[p.id];
        const out = totals(results, front, p.id, basis, hcp);
        const inn = totals(results, back, p.id, basis, hcp);
        const tot = totals(results, holes, p.id, basis, hcp);
        const strokes = hcp?.playingHandicap ?? 0;
        const strokesText = strokes === 0 ? 'gross' : strokes < 0 ? `gives ${Math.abs(strokes)}` : `${strokes} strokes`;
        const tone = tot.toPar < 0 ? 'positive' : tot.toPar > 0 ? 'negative' : 'primary';
        return (
          <View key={p.id} style={{ flexDirection: 'row', height: 40, alignItems: 'center', paddingLeft: 10, borderTopWidth: 1, borderTopColor: c.divider }}>
            <View style={{ flex: 1 }}>
              <Text step="bodyStrong" numberOfLines={1}>
                {p.name}
              </Text>
              <Text step="tab" tone="secondary">
                {strokesText}
                {hcp && hcp.courseHandicap !== hcp.playingHandicap ? ` (hcp ${formatSigned(hcp.courseHandicap)})` : ''}
              </Text>
            </View>
            <Num>{out.holesScored ? String(out.strokes) : ''}</Num>
            {!nineHole ? <Num>{inn.holesScored ? String(inn.strokes) : ''}</Num> : null}
            <View style={{ width: NUM_COL, alignItems: 'center' }}>
              {tot.holesScored ? (
                <Text step="bodyStrong" tone={tone} tabular>
                  {tot.strokes} ({formatToPar(tot.toPar)})
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Head({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: NUM_COL, alignItems: 'center' }}>
      <Text step="caption" style={{ color: c.gridHeaderText }}>
        {children}
      </Text>
    </View>
  );
}

function Num({ children }: { children: string }) {
  return (
    <View style={{ width: NUM_COL, alignItems: 'center' }}>
      <Text step="bodyStrong" tabular>
        {children}
      </Text>
    </View>
  );
}
