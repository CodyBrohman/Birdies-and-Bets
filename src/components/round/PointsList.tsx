import { useState } from 'react';
import { View } from 'react-native';
import { Icon, Pressable, Text } from '@/components/ui';
import { PRESSED_OPACITY, seatColors, useTheme } from '@/theme';
import type { Player } from '@/types';
import type { NettedSettlement } from '@/lib/settlement';
import { pointsBreakdown } from '@/lib/history';
import { formatSigned, formatStake } from '@/lib/format';

export interface PointsListProps {
  netted: NettedSettlement;
  players: Player[];
  stakeLabel: string;
}

/**
 * The points tally after every game: each player's net figure, then "How it nets out" with the pair-by-pair detail.
 * A tally only: nothing here says anyone pays or owes.
 */
export function PointsList({ netted, players, stakeLabel }: PointsListProps) {
  const { c, w, space } = useTheme();
  const [open, setOpen] = useState(false);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const signed = (n: number) => formatStake(n > 0 ? `+${n}` : formatSigned(n), stakeLabel);

  return (
    <View style={{ gap: space[2] }}>
      <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingHorizontal: space[4] }}>
        {players.map((p, i) => {
          const t = netted.totals[p.id] ?? 0;
          return (
            <View key={p.id} accessible accessibilityLabel={`${p.name}, ${t === 0 ? 'even' : signed(t)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}>
              <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: seatColors[i % seatColors.length]!.fill }} />
              <Text step="rowBody" style={{ flex: 1 }} numberOfLines={1}>
                {p.name}
              </Text>
              <Text step="rowBody" tabular style={{ fontWeight: t > 0 ? w.semibold : w.regular }}>
                {t === 0 ? 'Even' : signed(t)}
              </Text>
            </View>
          );
        })}
        {netted.pairs.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel="How it nets out"
            onPress={() => setOpen((v) => !v)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48, borderTopWidth: 1, borderTopColor: c.divider, opacity: pressed ? PRESSED_OPACITY : 1 })}
          >
            <Text step="rowBody" tone="accent" style={{ flex: 1 }}>
              How it nets out
            </Text>
            <Icon name="chevronDown" size={14} color={c.accent} />
          </Pressable>
        ) : null}
        {open
          ? netted.pairs.map((pair) => {
              const b = pointsBreakdown(pair, nameOf, stakeLabel);
              return (
                <View key={`${pair.from}>${pair.to}`} accessible accessibilityLabel={[b.line, ...b.parts].join('. ')} style={{ paddingVertical: space[3], gap: 2, borderTopWidth: 1, borderTopColor: c.divider }}>
                  <Text step="rowTitle">{b.line}</Text>
                  {b.parts.map((line, j) => (
                    <Text key={j} step="subhead" tone="secondary">
                      {line}
                    </Text>
                  ))}
                </View>
              );
            })
          : null}
      </View>
      <Text step="footnote" tone="tertiary" style={{ paddingHorizontal: space[4] }}>
        Points are a tally between players. Nothing is paid in the app.
      </Text>
    </View>
  );
}
