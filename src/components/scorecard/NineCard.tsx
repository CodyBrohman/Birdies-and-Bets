import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { seatColors, useTheme } from '@/theme';
import { Pressable, Text } from '@/components/ui';
import type { Hole, HoleResult, Player, PlayerId, PlayerRoundState, ScoringBasis } from '@/types';
import { relationToPar, scoreOn, totals } from '@/lib/scoring';
import { describeScore, initials } from '@/lib/format';
import { ScoreMark } from './ScoreMark';
import { StrokeDots } from './StrokeDots';

export interface NineCardProps {
  /** The subtotal column: OUT for the front nine, IN for the back. */
  label: 'Out' | 'In';
  /** The nine, in card order (1–9 or 10–18). */
  holes: Hole[];
  players: Player[];
  results: HoleResult[];
  basis: ScoringBasis;
  handicaps: Record<PlayerId, PlayerRoundState>;
  currentHole?: number;
  /** Adds a TOT column with totals over these holes (the back nine of an 18-hole card). */
  totalOver?: Hole[];
  /** "You" for the phone owner's row. */
  isMe?: (player: Player) => boolean;
  onPressHole?: (holeNumber: number) => void;
  /** For the Maestro screenshot flow. */
  testID?: string;
}

const LABEL_COL = 38;
/** Below this a column can't hold a marked two-digit score: the card scrolls sideways instead of squeezing. */
const MIN_COL = 24;

/**
 * One nine of the scorecard, laid out like the paper card: HOLE and PAR across the top, a row per player marked with
 * circles and squares, stroke dots, and OUT / IN (and TOT) at the end. The current hole's column is tinted; tapping a
 * column opens that hole. Each column is one VoiceOver element.
 */
export function NineCard({ label, holes, players, results, basis, handicaps, currentHole, totalOver, isMe, onPressHole, testID }: NineCardProps) {
  const { c, w, space } = useTheme();
  const [width, setWidth] = useState(0);
  const columns = holes.length + 1 + (totalOver ? 1 : 0);
  const fitted = width > 0 ? (width - LABEL_COL) / columns : MIN_COL;
  const scrolls = fitted < MIN_COL;
  const col = scrolls ? MIN_COL : fitted;
  const rowHeight = 34;
  const par = holes.reduce((n, h) => n + h.par, 0);
  const totalPar = totalOver?.reduce((n, h) => n + h.par, 0);

  const header = (text: string, key: string, tone: 'secondary' | 'tertiary' = 'tertiary') => (
    <View key={key} style={{ height: rowHeight, alignItems: 'center', justifyContent: 'center' }}>
      <Text step="tableHeader" tone={tone} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );

  const playerLabel = (p: Player, i: number) => (
    <View key={p.id} style={{ height: rowHeight, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: seatColors[i % seatColors.length]!.fill }} />
      <Text step="caption1" style={{ fontWeight: w.semibold }} numberOfLines={1}>
        {isMe?.(p) ? 'You' : initials(p.name)}
      </Text>
    </View>
  );

  const sum = (p: Player, over: Hole[]) => {
    const t = totals(results, over, p.id, basis, handicaps[p.id]);
    return t.holesScored ? String(t.strokes) : '';
  };

  const grid = (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: LABEL_COL }}>
        {header('Hole', 'h')}
        {header('Par', 'p', 'secondary')}
        {players.map(playerLabel)}
      </View>
      {holes.map((h) => {
        const current = h.number === currentHole;
        const cells = players.map((p) => {
          const hcp = handicaps[p.id];
          const v = scoreOn(results, p.id, h.number, basis, hcp);
          return { p, v, relation: typeof v === 'number' ? relationToPar(v - h.par) : undefined, strokes: hcp?.strokesByHole[h.number] ?? 0 };
        });
        return (
          <Pressable
            key={h.number}
            accessibilityRole={onPressHole ? 'button' : undefined}
            accessible
            accessibilityState={onPressHole ? { selected: current } : undefined}
            accessibilityLabel={`Hole ${h.number}, par ${h.par}. ${cells.map((x) => `${x.p.name} ${describeScore(x.v, x.relation, x.strokes)}`).join('; ')}`}
            disabled={!onPressHole}
            onPress={() => onPressHole?.(h.number)}
            style={{ width: col, borderRadius: 8, backgroundColor: current ? c.currentHole : 'transparent' }}
          >
            {header(String(h.number), 'n', current ? 'secondary' : 'tertiary')}
            {header(String(h.par), 'p', 'secondary')}
            {cells.map((x) => (
              <View key={x.p.id} style={{ height: rowHeight, alignItems: 'center', justifyContent: 'center' }}>
                <ScoreMark value={x.v} relation={x.relation} size={Math.min(26, col - 2)} step="subhead" blank />
                {x.strokes !== 0 ? (
                  <View style={{ position: 'absolute', top: 1, right: 1 }}>
                    <StrokeDots strokes={x.strokes} size={3} max={2} />
                  </View>
                ) : null}
              </View>
            ))}
          </Pressable>
        );
      })}
      <View
        accessible
        accessibilityLabel={`${label}, par ${par}. ${players.map((p) => `${p.name} ${sum(p, holes) || 'no score'}`).join('; ')}`}
        style={{ width: col, borderLeftWidth: 1, borderColor: c.divider }}
      >
        {header(label, 'l', 'secondary')}
        {header(String(par), 'p', 'secondary')}
        {players.map((p) => (
          <View key={p.id} style={{ height: rowHeight, alignItems: 'center', justifyContent: 'center' }}>
            <Text step="subhead" style={{ fontWeight: w.semibold }} tabular maxFontSizeMultiplier={1.3}>
              {sum(p, holes)}
            </Text>
          </View>
        ))}
      </View>
      {totalOver ? (
        <View
          accessible
          accessibilityLabel={`Total, par ${totalPar}. ${players.map((p) => `${p.name} ${sum(p, totalOver) || 'no score'}`).join('; ')}`}
          style={{ width: col, borderLeftWidth: 1, borderColor: c.divider }}
        >
          {header('Tot', 't', 'secondary')}
          {header(String(totalPar), 'p', 'secondary')}
          {players.map((p) => (
            <View key={p.id} style={{ height: rowHeight, alignItems: 'center', justifyContent: 'center' }}>
              <Text step="subhead" style={{ fontWeight: w.semibold }} tabular maxFontSizeMultiplier={1.3}>
                {sum(p, totalOver)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View
      testID={testID}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - space[3] * 2)}
      style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingVertical: space[2], paddingHorizontal: space[3] }}
    >
      {scrolls ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {grid}
        </ScrollView>
      ) : (
        grid
      )}
    </View>
  );
}
