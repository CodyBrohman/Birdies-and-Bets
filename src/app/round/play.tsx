import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Button, Screen, Stepper, Text } from '@/components/ui';
import { StrokeDots } from '@/components/scorecard';
import { HoleInputCard, missingInputs } from '@/components/games';
import { useReduceMotion, useTheme } from '@/theme';
import { useGameRuns, useHandicaps, useHoles, useRound, useRoundStore } from '@/store';
import type { GrossScore, PlayerScores } from '@/types';
import { relationToPar, totals } from '@/lib/scoring';
import { formatToPar, RELATION_LABEL } from '@/lib/format';

/**
 * Hole entry. One hole at a time, a 56×60 stepper per player, confirm advances.
 * Every stepper tap persists immediately; confirm also writes defaults for untouched players.
 */
export default function PlayScreen() {
  const router = useRouter();
  const { c, space, radius, motion } = useTheme();
  const round = useRound();
  const holes = useHoles(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const setScore = useRoundStore((s) => s.setScore);
  const recordHole = useRoundStore((s) => s.recordHole);
  const setCurrentHole = useRoundStore((s) => s.setCurrentHole);
  const setGameInputs = useRoundStore((s) => s.setGameInputs);

  const holeNumber = round?.currentHole ?? 1;
  const hole = holes.find((h) => h.number === holeNumber);
  const holeCount = round?.settings.holeCount ?? 18;
  const result = round?.holeResults.find((r) => r.holeNumber === holeNumber);

  // Local entry mirrors the saved hole; unsaved players default to par.
  const [entry, setEntry] = useState<PlayerScores>({});
  useEffect(() => {
    if (!round || !hole) return;
    const next: PlayerScores = {};
    for (const p of round.players) {
      const saved = result?.scores[p.id];
      next[p.id] = saved === undefined ? hole.par : saved;
    }
    setEntry(next);
    // Only reseed when the hole changes, not on every persisted tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeNumber, round?.id]);

  const pop = useRef(new Animated.Value(1)).current;
  const reduce = useReduceMotion();
  const playPop = () => {
    if (reduce) return;
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.12, duration: motion.confirmPop / 2, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: motion.confirmPop / 2, useNativeDriver: true }),
    ]).start();
  };

  const playedCount = useMemo(() => new Set(round?.holeResults.filter((r) => Object.keys(r.scores).length > 0).map((r) => r.holeNumber)).size, [round]);

  if (!round || !hole) return null;

  // Games that need more than strokes on this hole, with their saved answers.
  const inputGames = runs.filter((r) => (r.mode.holeInputs?.length ?? 0) > 0);
  const answersFor = (gameId: string) => result?.gameInputs?.[gameId] ?? {};
  const unanswered = inputGames.filter((r) => missingInputs(r.mode.holeInputs ?? [], answersFor(r.gameId)).length > 0);
  const answer = (gameId: string, key: string, value: string | undefined) => {
    const next = { ...answersFor(gameId) };
    if (value === undefined) delete next[key];
    else next[key] = value;
    // Clear answers that are no longer visible (showIf) so stale picks never count.
    const mode = inputGames.find((r) => r.gameId === gameId)?.mode;
    for (const spec of mode?.holeInputs ?? []) if (spec.showIf && next[spec.showIf.key] !== spec.showIf.equals) delete next[spec.key];
    setGameInputs(holeNumber, gameId, next);
  };

  const change = (playerId: string, score: GrossScore) => {
    setEntry((e) => ({ ...e, [playerId]: score }));
    setScore(playerId, holeNumber, score);
  };

  const confirm = () => {
    recordHole(holeNumber, entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    playPop();
    if (holeNumber >= holeCount) {
      router.push('/round/summary');
    } else {
      setCurrentHole(holeNumber + 1);
    }
  };

  const last = holeNumber >= holeCount;
  const yards = hole.yardage?.[round.teeBoxId];

  return (
    <Screen noBottomInset>
      {/* Hole header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space[2] }} accessibilityRole="header" accessibilityLabel={`Hole ${holeNumber}, par ${hole.par}, stroke index ${hole.strokeIndex}`}>
        <NavButton label="Previous hole" glyph="‹" disabled={holeNumber <= 1} onPress={() => setCurrentHole(holeNumber - 1)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text step="displayXl">Hole {holeNumber}</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Text step="label" tone="secondary">
              Par {hole.par}
            </Text>
            {yards ? (
              <Text step="label" tone="secondary" tabular>
                {yards} yds
              </Text>
            ) : null}
            <Text step="label" tone="secondary">
              SI {hole.strokeIndex}
            </Text>
          </View>
        </View>
        <NavButton label="Next hole" glyph="›" disabled={holeNumber >= holeCount} onPress={() => setCurrentHole(holeNumber + 1)} />
      </View>

      {/* Progress ticks */}
      <View style={{ flexDirection: 'row', gap: 3, paddingVertical: space[3] }} accessibilityLabel={`${playedCount} of ${holeCount} holes played`}>
        {holes.map((h) => {
          const played = round.holeResults.some((r) => r.holeNumber === h.number && Object.keys(r.scores).length > 0);
          const current = h.number === holeNumber;
          return <View key={h.number} style={{ flex: 1, height: 6, borderRadius: radius.xs / 2, backgroundColor: current ? c.accent : played ? c.textPrimary : c.divider }} />;
        })}
      </View>

      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: space[3] }} keyboardShouldPersistTaps="handled">
        {runs.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Game standings"
            onPress={() => router.navigate('/round/standings')}
            style={({ pressed }) => ({ minHeight: 36, backgroundColor: pressed ? c.accentTint : c.surfaceRaised, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[2], gap: 4 })}
          >
            {runs.map((run) => (
              <View key={run.gameId} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: run.mode.category === 'betting' ? c.accent : c.positive }} />
                <Text step="caption" tabular={false} numberOfLines={1} style={{ flex: 1 }}>
                  {run.standings.headline}
                </Text>
              </View>
            ))}
          </Pressable>
        ) : null}
        {round.players.map((p) => {
          const strokes = handicaps[p.id]?.strokesByHole[holeNumber] ?? 0;
          const score = entry[p.id];
          const pickedUp = score === null;
          const value = typeof score === 'number' ? score : hole.par;
          const diff = value - hole.par;
          const relation = relationToPar(diff);
          const tone = pickedUp ? 'primary' : diff < 0 ? 'positive' : diff > 0 ? 'negative' : 'primary';
          const t = totals(round.holeResults, holes.filter((h) => h.number < holeNumber), p.id, 'gross');
          const strokeText =
            strokes > 0 ? `Gets ${strokes} stroke${strokes > 1 ? 's' : ''} here · net ${value - strokes}` : strokes < 0 ? 'Gives one back here' : 'No stroke here';
          return (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surfaceRaised,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: c.divider,
                paddingVertical: 8,
                paddingRight: 8,
                paddingLeft: 14,
                gap: space[2],
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <Text step="bodyStrong" style={{ fontSize: 19 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <StrokeDots strokes={strokes} />
                </View>
                <Text step="caption" tone="secondary" tabular={false}>
                  {pickedUp ? 'Picked up · no score' : strokeText}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'nowrap' }}>
                  <Text step="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {t.holesScored > 0 ? `${t.strokes} · ${formatToPar(t.toPar)} thru ${holeNumber - 1}` : 'First hole'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={pickedUp ? `${p.name} back in` : `${p.name} picked up`}
                    onPress={() => change(p.id, pickedUp ? hole.par : null)}
                    hitSlop={8}
                  >
                    <Text step="caption" tone="accent" tabular={false}>
                      {pickedUp ? 'Enter score' : 'Pick up'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              {pickedUp ? (
                <View style={{ width: 172, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                  <Text step="score" tone="secondary">
                    –
                  </Text>
                </View>
              ) : (
                <Stepper value={value} onChange={(v) => change(p.id, v)} caption={RELATION_LABEL[relation]} tone={tone} accessibilityLabel={`${p.name} score`} />
              )}
            </View>
          );
        })}
        {inputGames.map((r) => {
          const active = round.games.find((g) => g.gameId === r.gameId);
          const participants = active?.playerIds ? round.players.filter((pl) => active.playerIds!.includes(pl.id)) : round.players;
          return <HoleInputCard key={r.gameId} mode={r.mode} participants={participants} answers={answersFor(r.gameId)} onAnswer={(k, v) => answer(r.gameId, k, v)} />;
        })}
      </ScrollView>

      <Animated.View style={{ paddingBottom: space[3], transform: [{ scale: pop }] }}>
        <Button
          label={unanswered.length ? 'Answer game prompts to confirm' : last ? 'Confirm · finish round' : `Confirm · to hole ${holeNumber + 1}`}
          disabled={unanswered.length > 0}
          onPress={confirm}
        />
      </Animated.View>
    </Screen>
  );
}

function NavButton({ label, glyph, disabled, onPress }: { label: string; glyph: string; disabled: boolean; onPress: () => void }) {
  const { c, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 56,
        height: 56,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: pressed ? c.accent : c.divider,
        backgroundColor: pressed ? c.accentTint : c.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Text step="headline">{glyph}</Text>
    </Pressable>
  );
}
