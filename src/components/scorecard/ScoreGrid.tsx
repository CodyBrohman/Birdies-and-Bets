import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { Hole, HoleResult, Player, PlayerId, PlayerRoundState, ScoringBasis } from '@/types';
import { relationToPar, scoreOn, totals } from '@/lib/scoring';
import { initials } from '@/lib/format';
import { ScoreCell } from './ScoreCell';

export interface ScoreGridProps {
  /** Nine (or fewer) holes for this block. */
  holes: Hole[];
  /** "Out" or "In". */
  subtotalLabel: string;
  players: Player[];
  results: HoleResult[];
  basis: ScoringBasis;
  handicaps: Record<PlayerId, PlayerRoundState>;
  currentHole: number;
  onPressHole?: (holeNumber: number) => void;
}

const NAME_COL = 34;
const SUB_COL = 40;

/** One nine-hole block: header, par, SI, then a 40pt row per player with an Out/In subtotal. */
export function ScoreGrid({ holes, subtotalLabel, players, results, basis, handicaps, currentHole, onPressHole }: ScoreGridProps) {
  const { c, radius } = useTheme();
  const blockPar = holes.reduce((s, h) => s + h.par, 0);

  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', height: 26, backgroundColor: c.gridHeader, alignItems: 'center' }}>
        <View style={{ width: NAME_COL, alignItems: 'center' }}>
          <Text step="caption" style={{ color: c.gridHeaderText }}>
            Hole
          </Text>
        </View>
        {holes.map((h) => {
          const current = h.number === currentHole;
          return (
            <Pressable
              key={h.number}
              accessibilityRole="button"
              accessibilityLabel={`Hole ${h.number}`}
              onPress={() => onPressHole?.(h.number)}
              style={{ flex: 1, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: current ? c.accent : 'transparent' }}
            >
              <Text step="caption" style={{ color: current ? c.onAccent : c.gridHeaderText }}>
                {h.number}
              </Text>
            </Pressable>
          );
        })}
        <View style={{ width: SUB_COL, alignItems: 'center' }}>
          <Text step="caption" style={{ color: c.gridHeaderText }}>
            {subtotalLabel}
          </Text>
        </View>
      </View>

      {/* Par */}
      <Row label="Par" height={24}>
        {holes.map((h) => (
          <Cell key={h.number} current={h.number === currentHole}>
            <Text step="caption" tone="secondary" style={{ fontSize: 14 }}>
              {h.par}
            </Text>
          </Cell>
        ))}
        <View style={{ width: SUB_COL, alignItems: 'center' }}>
          <Text step="caption" tone="secondary" style={{ fontSize: 14 }}>
            {blockPar}
          </Text>
        </View>
      </Row>

      {/* Stroke index */}
      <Row label="SI" height={22}>
        {holes.map((h) => (
          <Cell key={h.number} current={h.number === currentHole}>
            <Text step="tab" tone="secondary">
              {h.strokeIndex}
            </Text>
          </Cell>
        ))}
        <View style={{ width: SUB_COL }} />
      </Row>

      {/* Players */}
      {players.map((p) => {
        const hcp = handicaps[p.id];
        const t = totals(results, holes, p.id, basis, hcp);
        return (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: c.divider }}>
            <View style={{ width: NAME_COL, alignItems: 'center' }}>
              <Text step="label" numberOfLines={1}>
                {initials(p.name)}
              </Text>
            </View>
            {holes.map((h) => {
              const v = scoreOn(results, p.id, h.number, basis, hcp);
              const relation = typeof v === 'number' ? relationToPar(v - h.par) : undefined;
              return (
                <ScoreCell key={h.number} value={v} relation={relation} strokes={hcp?.strokesByHole[h.number] ?? 0} current={h.number === currentHole} />
              );
            })}
            <View style={{ width: SUB_COL, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: c.gridSubtotal }}>
              <Text step="bodyStrong" tabular>
                {t.holesScored > 0 ? String(t.strokes) : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Row({ label, height, children }: { label: string; height: number; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', height, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.divider }}>
      <View style={{ width: NAME_COL, alignItems: 'center' }}>
        <Text step="tab" tone="secondary">
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Cell({ current, children }: { current: boolean; children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: current ? c.currentHole : 'transparent' }}>{children}</View>;
}
