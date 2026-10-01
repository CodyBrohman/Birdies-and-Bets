import { Fragment } from 'react';
import { View } from 'react-native';
import { useFontScale, useTheme } from '@/theme';
import { Text, Pressable } from '@/components/ui';
import type { Hole, HoleResult, Player, PlayerId, PlayerRoundState, ScoringBasis } from '@/types';
import { backNine, frontNine, relationToPar, scoreOn, totals } from '@/lib/scoring';
import { describeHoleRow, describeScore, describeTotalsRow, formatToPar } from '@/lib/format';
import { ScoreCell } from './ScoreCell';

export interface ScoreTableProps {
  holes: Hole[];
  players: Player[];
  results: HoleResult[];
  basis: ScoringBasis;
  handicaps: Record<PlayerId, PlayerRoundState>;
  currentHole: number;
  onPressHole?: (holeNumber: number) => void;
}

const HOLE_COL = 44;
const PAR_COL = 40;
const SI_COL = 40;

/**
 * The full card, holes as rows and players as columns. Out/In subtotal rows after 9 and 18,
 * a Total row at the end, and the current hole tinted. Tap a hole row to jump to it.
 * Every row is one VoiceOver element that reads the hole and each player's score in column order.
 */
export function ScoreTable({ holes, players, results, basis, handicaps, currentHole, onPressHole }: ScoreTableProps) {
  const { c, radius, space } = useTheme();
  const scale = useFontScale();
  const cols = { hole: Math.round(HOLE_COL * scale), par: Math.round(PAR_COL * scale), si: Math.round(SI_COL * scale) };
  const front = frontNine(holes);
  const back = backNine(holes);
  const blocks = [
    { label: 'Out', holes: front },
    { label: 'In', holes: back },
  ].filter((b) => b.holes.length > 0);
  const firstName = (p: Player) => p.name.trim().split(/\s+/)[0] ?? p.name;

  return (
    <View>
      {/* Header */}
      <View accessible accessibilityRole="header" accessibilityLabel={`Scorecard, ${basis}. Columns: hole, par, stroke index, then ${players.map((p) => p.name).join(', ')}`} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingHorizontal: space[2] }}>
        <Text step="overline" tone="tertiary" style={{ width: cols.hole }}>
          Hole
        </Text>
        <Text step="overline" tone="tertiary" style={{ width: cols.par }}>
          Par
        </Text>
        <Text step="overline" tone="tertiary" style={{ width: cols.si }}>
          SI
        </Text>
        {players.map((p) => (
          <Text key={p.id} step="label" tone="secondary" align="center" numberOfLines={1} style={{ flex: 1 }}>
            {firstName(p)}
          </Text>
        ))}
      </View>

      {blocks.map((block) => (
        <Fragment key={block.label}>
          {block.holes.map((h) => {
            const current = h.number === currentHole;
            const cells = players.map((p) => {
              const hcp = handicaps[p.id];
              const v = scoreOn(results, p.id, h.number, basis, hcp);
              const relation = typeof v === 'number' ? relationToPar(v - h.par) : undefined;
              const strokes = hcp?.strokesByHole[h.number] ?? 0;
              return { player: p, v, relation, strokes };
            });
            const label = describeHoleRow(
              h,
              cells.map((x) => ({ name: x.player.name, text: describeScore(x.v, x.relation, x.strokes) })),
              current,
            );
            return (
              <Pressable
                key={h.number}
                accessibilityRole={onPressHole ? 'button' : 'text'}
                accessibilityLabel={label}
                accessibilityHint={onPressHole ? 'Opens this hole for scoring' : undefined}
                disabled={!onPressHole}
                onPress={() => onPressHole?.(h.number)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 52,
                  paddingHorizontal: space[2],
                  borderRadius: radius.lg,
                  backgroundColor: current ? c.currentHole : pressed ? c.surfaceRaised : 'transparent',
                })}
              >
                <Text step="total" style={{ width: cols.hole }}>
                  {h.number}
                </Text>
                <Text step="body" tone="secondary" tabular style={{ width: cols.par }}>
                  {h.par}
                </Text>
                <Text step="body" tone="tertiary" tabular style={{ width: cols.si }}>
                  {h.strokeIndex}
                </Text>
                {cells.map((x) => (
                  <ScoreCell key={x.player.id} value={x.v} relation={x.relation} strokes={x.strokes} hidden />
                ))}
              </Pressable>
            );
          })}
          <SubtotalRow label={block.label} holes={block.holes} players={players} results={results} basis={basis} handicaps={handicaps} cols={cols} />
        </Fragment>
      ))}

      {/* Total */}
      {(() => {
        const rows = players.map((p) => ({ name: p.name, t: totals(results, holes, p.id, basis, handicaps[p.id]) }));
        return (
          <View
            accessible
            accessibilityLabel={describeTotalsRow(
              'Total',
              null,
              rows.map((r) => ({ name: r.name, strokes: r.t.holesScored ? r.t.strokes : null, toPar: r.t.holesScored ? r.t.toPar : undefined })),
            )}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space[2], marginTop: space[1] }}
          >
            <Text step="total" style={{ width: cols.hole + cols.par }}>
              Total
            </Text>
            <View style={{ width: cols.si }} />
            {rows.map((r, i) => {
              const tone = r.t.toPar < 0 ? 'positiveText' : r.t.toPar > 0 ? 'gold' : 'secondary';
              return (
                <View key={players[i]!.id} style={{ flex: 1, alignItems: 'center' }}>
                  <Text step="total">{r.t.holesScored ? String(r.t.strokes) : ''}</Text>
                  {r.t.holesScored ? (
                    <Text step="caption" tone={tone}>
                      {formatToPar(r.t.toPar)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })()}
    </View>
  );
}

function SubtotalRow({ label, holes, players, results, basis, handicaps, cols }: { label: string; holes: Hole[]; players: Player[]; results: HoleResult[]; basis: ScoringBasis; handicaps: Record<PlayerId, PlayerRoundState>; cols: { hole: number; par: number; si: number } }) {
  const { c, radius, space } = useTheme();
  const par = holes.reduce((s, h) => s + h.par, 0);
  const rows = players.map((p) => ({ name: p.name, t: totals(results, holes, p.id, basis, handicaps[p.id]) }));
  return (
    <View
      accessible
      accessibilityLabel={describeTotalsRow(
        label,
        par,
        rows.map((r) => ({ name: r.name, strokes: r.t.holesScored ? r.t.strokes : null })),
      )}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: space[2], marginVertical: space[1], borderRadius: radius.lg, backgroundColor: c.surfaceRaised }}
    >
      <Text step="total" style={{ width: cols.hole }}>
        {label}
      </Text>
      <Text step="total" tone="secondary" style={{ width: cols.par }}>
        {par}
      </Text>
      <View style={{ width: cols.si }} />
      {rows.map((r, i) => (
        <Text key={players[i]!.id} step="total" align="center" style={{ flex: 1 }}>
          {r.t.holesScored ? String(r.t.strokes) : ''}
        </Text>
      ))}
    </View>
  );
}
