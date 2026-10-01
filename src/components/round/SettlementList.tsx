import { useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, Card, Text, Pressable } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Player } from '@/types';
import { auditLines, type NettedSettlement } from '@/lib/settlement';
import { formatStake, formatToPar } from '@/lib/format';

export interface SettlementListProps {
  netted: NettedSettlement;
  players: Player[];
  stakeLabel: string;
}

/** "Priya pays → Marcus  23 pts" rows, netted across games; tap a row to see how it adds up. */
export function SettlementList({ netted, players, stakeLabel }: SettlementListProps) {
  const { c, space, radius } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const indexOf = (id: string) => players.findIndex((p) => p.id === id);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      {netted.pairs.length === 0 ? (
        <Card variant="outlined">
          <Text tone="secondary">Nothing to settle. Everyone is square.</Text>
        </Card>
      ) : (
        netted.pairs.map((pair) => {
          const key = `${pair.from}>${pair.to}`;
          const expanded = open === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${nameOf(pair.from)} pays ${nameOf(pair.to)} ${formatStake(pair.amount, stakeLabel)}`}
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : key)}
            >
              {({ pressed }) => (
                <View style={{ backgroundColor: c.accentTint, borderRadius: expanded ? radius.xl : radius.pill, paddingHorizontal: space[4], paddingVertical: space[3], opacity: pressed ? 0.85 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                    <Avatar name={nameOf(pair.from)} index={indexOf(pair.from)} size={44} />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
                      <Text step="bodyStrong" tone="accentTintText" numberOfLines={1}>
                        {nameOf(pair.from)}
                      </Text>
                      <Text step="body" tone="accentTintText" style={{ opacity: 0.7 }}>
                        pays
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={c.accentTintText} />
                      <Text step="bodyStrong" tone="accentTintText" numberOfLines={1}>
                        {nameOf(pair.to)}
                      </Text>
                    </View>
                    <Text step="score" tone="accentTintText" style={{ fontSize: 22, lineHeight: 26 }}>
                      {formatStake(pair.amount, stakeLabel)}
                    </Text>
                  </View>
                  {expanded ? (
                    <View style={{ paddingTop: space[3], gap: 2 }}>
                      {auditLines(pair, nameOf).map((line, j) => (
                        <Text key={j} step="caption" tone="accentTintText" tabular={false}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            </Pressable>
          );
        })
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], paddingHorizontal: space[2] }}>
        {players.map((p) => {
          const t = netted.totals[p.id] ?? 0;
          return (
            <Text key={p.id} step="caption" tone={t > 0 ? 'positiveText' : t < 0 ? 'accent' : 'tertiary'}>
              {p.name} {formatStake(formatToPar(t), stakeLabel)}
            </Text>
          );
        })}
      </View>
    </>
  );
}
