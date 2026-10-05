import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Card, Text, Pressable } from '@/components/ui';
import type { Hole, HoleResult, Player } from '@/types';
import { scoreOn } from '@/lib/scoring';

export interface NineCardProps {
  title: string;
  holes: Hole[];
  players: Player[];
  results: HoleResult[];
  currentHole: number;
  /** Row label per player ("You" for the phone owner). */
  labelFor: (player: Player) => string;
  onPressHole?: (holeNumber: number) => void;
}

const LABEL_COL = 60;
const ROW = 30;

/**
 * One nine of the live card from the scorecard mockup: hole numbers across, a par row, then a gross row per player.
 * Columns flex to the card width so nothing scrolls sideways; the current hole's column is tinted. Tap a column to jump to it.
 */
export function NineCard({ title, holes, players, results, currentHole, labelFor, onPressHole }: NineCardProps) {
  const { c, f, radius, space } = useTheme();
  const par = holes.reduce((sum, h) => sum + h.par, 0);
  const small = { fontFamily: f.uiSemibold, fontSize: 12, lineHeight: 16 };

  return (
    <Card style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text step="title">{title}</Text>
        <Text step="caption" tone="tertiary">
          Par {par}
        </Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {/* Row labels */}
        <View style={{ width: LABEL_COL }}>
          <View style={{ height: ROW, justifyContent: 'center' }}>
            <Text step="overline" tone="tertiary" style={{ fontSize: 9 }}>
              Player
            </Text>
          </View>
          <View style={{ height: ROW, justifyContent: 'center', borderBottomWidth: 1, borderColor: c.divider }}>
            <Text step="overline" tone="secondary" style={{ fontSize: 10 }}>
              Par
            </Text>
          </View>
          {players.map((p) => (
            <View key={p.id} style={{ height: ROW, justifyContent: 'center' }}>
              <Text step="caption" numberOfLines={1} style={{ ...small, color: c.textPrimary }}>
                {labelFor(p)}
              </Text>
            </View>
          ))}
        </View>
        {/* One column per hole */}
        {holes.map((h) => {
          const current = h.number === currentHole;
          const cell = (text: string, tone: 'primary' | 'secondary' | 'tertiary', key?: string, last?: boolean) => (
            <View key={key} style={{ height: ROW, alignItems: 'center', justifyContent: 'center', borderBottomWidth: last ? 1 : 0, borderColor: c.divider }}>
              <View style={{ minWidth: 24, height: 24, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: current ? c.accentTint : 'transparent' }}>
                <Text step="caption" tone={tone} style={small}>
                  {text}
                </Text>
              </View>
            </View>
          );
          const entries = players.map((p) => {
            const s = scoreOn(results, p.id, h.number, 'gross');
            return { p, text: s === undefined ? '-' : s === null ? 'PU' : String(s) };
          });
          return (
            <Pressable
              key={h.number}
              accessibilityRole="button"
              accessibilityLabel={`Hole ${h.number}, par ${h.par}. ${entries.map((e) => `${e.p.name} ${e.text === '-' ? 'no score' : e.text === 'PU' ? 'picked up' : e.text}`).join(', ')}${current ? '. Current hole' : ''}`}
              disabled={!onPressHole}
              onPress={() => onPressHole?.(h.number)}
              style={{ flex: 1 }}
            >
              {cell(String(h.number), 'secondary')}
              {cell(String(h.par), 'secondary', undefined, true)}
              {entries.map((e) => cell(e.text, e.text === '-' ? 'tertiary' : 'primary', e.p.id))}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
