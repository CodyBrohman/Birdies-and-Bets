import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { useGameRuns, useHandicaps, useHoles, useRound, useRoundStore } from '@/store';
import { totals } from '@/lib/scoring';
import { formatSigned, formatToPar, joinMeta } from '@/lib/format';
import { auditLines, netSettlements } from '@/lib/settlement';

/**
 * Round summary. Final gross and net, strokes received, per-game results, and the settlement netted
 * across every game into one figure per pair. Tap a row to audit it.
 * Display only: no pay button, no payment links, nothing that implies money movement.
 */
export default function SummaryScreen() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const round = useRound();
  const holes = useHoles(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const finishRound = useRoundStore((s) => s.finishRound);
  const discardRound = useRoundStore((s) => s.discardRound);
  const [open, setOpen] = useState<string | null>(null);

  const netted = useMemo(() => netSettlements(runs.map((r) => r.settlement), round?.players.map((p) => p.id) ?? []), [runs, round]);

  if (!round) return null;
  const tee = round.course.teeBoxes.find((t) => t.id === round.teeBoxId);
  const unit = round.settings.stakeLabel === 'points' ? 'pts' : round.settings.stakeLabel;
  const nameOf = (id: string) => round.players.find((p) => p.id === id)?.name ?? id;
  const betting = runs.filter((r) => r.mode.category === 'betting');

  const done = () => {
    finishRound();
    // Round history is out of scope for v1: a finished round is cleared so Home offers a fresh start.
    discardRound();
    router.replace('/');
  };

  return (
    <Screen>
      <View style={{ paddingVertical: space[2] }}>
        <Text step="display" style={{ fontSize: 26, lineHeight: 30 }}>
          Round complete
        </Text>
        <Text step="label" tone="secondary">
          {joinMeta([round.course.name, tee?.name, `${round.settings.holeCount} holes`])}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: space[4] }}>
        {/* Scores */}
        <View style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', height: 26, alignItems: 'center', backgroundColor: c.gridHeader, paddingLeft: 12 }}>
            <Text step="caption" style={{ flex: 1, color: c.gridHeaderText }}>
              Player
            </Text>
            <Col>
              <Text step="caption" style={{ color: c.gridHeaderText }}>
                Gross
              </Text>
            </Col>
            <Col>
              <Text step="caption" style={{ color: c.gridHeaderText }}>
                Net
              </Text>
            </Col>
            <Col wide>
              <Text step="caption" style={{ color: c.gridHeaderText }}>
                Strokes
              </Text>
            </Col>
          </View>
          {round.players.map((p) => {
            const hcp = handicaps[p.id];
            const gross = totals(round.holeResults, holes, p.id, 'gross');
            const net = totals(round.holeResults, holes, p.id, 'net', hcp);
            return (
              <View key={p.id} style={{ flexDirection: 'row', height: 44, alignItems: 'center', paddingLeft: 12, borderTopWidth: 1, borderTopColor: c.divider }}>
                <View style={{ flex: 1 }}>
                  <Text step="bodyStrong" numberOfLines={1}>
                    {p.name}
                  </Text>
                  {gross.holesPickedUp ? (
                    <Text step="tab" tone="secondary">
                      picked up {gross.holesPickedUp}×
                    </Text>
                  ) : null}
                </View>
                <Col>
                  <Text step="bodyStrong" tabular>
                    {gross.strokes}
                  </Text>
                  <Text step="tab" tone="secondary">
                    {formatToPar(gross.toPar)}
                  </Text>
                </Col>
                <Col>
                  <Text step="bodyStrong" tabular>
                    {net.strokes}
                  </Text>
                  <Text step="tab" tone="secondary">
                    {formatToPar(net.toPar)}
                  </Text>
                </Col>
                <Col wide>
                  <Text step="bodyStrong" tabular>
                    {formatSigned(hcp?.playingHandicap ?? 0)}
                  </Text>
                </Col>
              </View>
            );
          })}
        </View>

        {/* Games */}
        {runs.length > 0 ? (
          <View style={{ gap: space[2] }}>
            <Text step="label" tone="secondary">
              Games
            </Text>
            {runs.map((run) => {
              const active = round.games.find((g) => g.gameId === run.gameId);
              const stake = active && typeof active.config.stake === 'number' ? active.config.stake : 0;
              return (
                <View
                  key={run.gameId}
                  style={{
                    backgroundColor: c.surfaceRaised,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: c.divider,
                    borderTopWidth: 4,
                    borderTopColor: run.mode.category === 'betting' ? c.accent : c.positive,
                    padding: space[3],
                    gap: 4,
                  }}
                >
                  <Text step="caption" tone="secondary" tabular={false}>
                    {joinMeta([run.mode.name, run.mode.supportsNet ? run.standings.basis : null, stake ? `${stake} ${unit}` : run.mode.category === 'betting' ? 'no stake' : null])}
                  </Text>
                  <Text step="bodyStrong">{run.standings.headline}</Text>
                  {run.standings.lines.length > 0 ? (
                    <Text step="caption" tone="secondary" tabular={false}>
                      {run.standings.lines.map((l) => l.text).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Settlement */}
        {betting.length > 0 ? (
          <View style={{ gap: space[2] }}>
            <Text step="label" tone="secondary">
              Settlement — netted across all games · tap a row to audit
            </Text>
            {netted.pairs.length === 0 ? (
              <Card>
                <Text tone="secondary">Nothing to settle. Everyone is square.</Text>
              </Card>
            ) : (
              <View style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
                {netted.pairs.map((pair, i) => {
                  const key = `${pair.from}>${pair.to}`;
                  const expanded = open === key;
                  return (
                    <View key={key} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${nameOf(pair.from)} owes ${nameOf(pair.to)} ${pair.amount} ${unit}`}
                        accessibilityState={{ expanded }}
                        onPress={() => setOpen(expanded ? null : key)}
                        style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], gap: space[2], backgroundColor: pressed ? c.accentTint : 'transparent' })}
                      >
                        <Text step="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                          {nameOf(pair.from)} → {nameOf(pair.to)}
                        </Text>
                        <Text step="total" tabular style={{ fontSize: 20 }}>
                          {pair.amount} {unit}
                        </Text>
                        <Text step="label" tone="secondary">
                          {expanded ? '⌃' : '⌄'}
                        </Text>
                      </Pressable>
                      {expanded ? (
                        <View style={{ paddingHorizontal: space[3], paddingBottom: space[3], gap: 2 }}>
                          {auditLines(pair, nameOf).map((line, j) => (
                            <Text key={j} step="caption" tone="secondary" tabular={false}>
                              {line}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
              {round.players.map((p) => {
                const t = netted.totals[p.id] ?? 0;
                return (
                  <Text key={p.id} step="caption" tone={t > 0 ? 'positive' : t < 0 ? 'negative' : 'secondary'}>
                    {p.name} {formatToPar(t)}
                  </Text>
                );
              })}
            </View>
          </View>
        ) : null}

        <Card>
          <Text step="caption" tone="secondary" tabular={false}>
            Points are a tally between players. Birdies & Bets does not hold, move or request money.
          </Text>
        </Card>
      </ScrollView>
      <View style={{ gap: space[2], paddingBottom: space[3] }}>
        <Button label="Done" onPress={done} />
        <Button label="Back to the card" variant="secondary" onPress={() => router.navigate('/round/card')} />
      </View>
    </Screen>
  );
}

function Col({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <View style={{ width: wide ? 72 : 60, alignItems: 'center' }}>{children}</View>;
}
