import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, Badge, Button, Card, IconButton, Screen, Sheet, Text, TextField, Pressable } from '@/components/ui';
import { ScoreChip } from '@/components/scorecard';
import { HoleInputCard, missingInputs } from '@/components/games';
import { haptic, useReduceMotion, useTheme } from '@/theme';
import { MAX_NOTE_LENGTH, useGameRuns, useHandicaps, usePlayOrder, useRound, useRoundStore } from '@/store';
import type { GrossScore, PlayerScores } from '@/types';
import { holePosition, holesPlayed, nextHoleNumber, prevHoleNumber, scoreOptions, totals } from '@/lib/scoring';
import { formatToPar, joinMeta, plural, scoreChipLabel } from '@/lib/format';

/**
 * Hole entry. One hole at a time, a row of score chips per player. Every tap persists immediately.
 * When everyone has a score and every game prompt is answered, the hole records itself and advances
 * to the next hole in play order (which wraps around on a shotgun start).
 */
/** Gap between score chips in the entry grid. */
const CHIP_GAP = 8;

export default function PlayScreen() {
  const router = useRouter();
  const { c, space, radius, motion, layout } = useTheme();
  const round = useRound();
  const order = usePlayOrder(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const setScore = useRoundStore((s) => s.setScore);
  const setScores = useRoundStore((s) => s.setScores);
  const undoLastScore = useRoundStore((s) => s.undoLastScore);
  const undoStack = useRoundStore((s) => s.undo);
  const setHoleNote = useRoundStore((s) => s.setHoleNote);
  const recordHole = useRoundStore((s) => s.recordHole);
  const setCurrentHole = useRoundStore((s) => s.setCurrentHole);
  const setGameInputs = useRoundStore((s) => s.setGameInputs);

  const holeNumber = round?.currentHole ?? order[0]?.number ?? 1;
  const hole = order.find((h) => h.number === holeNumber);
  const position = holePosition(order, holeNumber);
  const prev = prevHoleNumber(order, holeNumber);
  const next = nextHoleNumber(order, holeNumber);
  const result = round?.holeResults.find((r) => r.holeNumber === holeNumber);
  const scores = result?.scores ?? {};

  const pop = useRef(new Animated.Value(1)).current;
  const reduce = useReduceMotion();
  const [undone, setUndone] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [gridWidth, setGridWidth] = useState(0);

  const playedCount = round ? holesPlayed(round.holeResults, order) : 0;

  // Games that need more than strokes on this hole, with their saved answers.
  const inputGames = runs.filter((r) => (r.mode.holeInputs?.length ?? 0) > 0);
  const answersFor = (gameId: string) => result?.gameInputs?.[gameId] ?? {};
  const unanswered = inputGames.filter((r) => missingInputs(r.mode.holeInputs ?? [], answersFor(r.gameId)).length > 0);
  const complete = !!round && round.players.every((p) => p.id in scores) && unanswered.length === 0;

  // Auto-advance once per hole, only when the hole becomes complete while it is on screen.
  const wasComplete = useRef(complete);
  const holeRef = useRef(holeNumber);
  useEffect(() => {
    if (holeRef.current !== holeNumber) {
      holeRef.current = holeNumber;
      wasComplete.current = complete;
      return;
    }
    if (!complete || wasComplete.current) {
      wasComplete.current = complete;
      return;
    }
    wasComplete.current = true;
    haptic.success();
    if (!reduce) {
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.08, duration: motion.confirmPop / 2, useNativeDriver: true }),
        Animated.timing(pop, { toValue: 1, duration: motion.confirmPop / 2, useNativeDriver: true }),
      ]).start();
    }
    const timer = setTimeout(
      () => {
        recordHole(holeNumber, scores);
        if (next == null) router.push('/round/summary');
        else setCurrentHole(next);
      },
      reduce ? 0 : motion.advance,
    );
    return () => clearTimeout(timer);
    // scores is derived from the store; complete captures the change we care about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, holeNumber]);

  if (!round || !hole) return null;

  const answer = (gameId: string, key: string, value: string | undefined) => {
    const nextAnswers = { ...answersFor(gameId) };
    if (value === undefined) delete nextAnswers[key];
    else nextAnswers[key] = value;
    // Clear answers that are no longer visible (showIf) so stale picks never count.
    const mode = inputGames.find((r) => r.gameId === gameId)?.mode;
    for (const spec of mode?.holeInputs ?? []) if (spec.showIf && nextAnswers[spec.showIf.key] !== spec.showIf.equals) delete nextAnswers[spec.key];
    setGameInputs(holeNumber, gameId, nextAnswers);
  };

  const change = (playerId: string, score: GrossScore) => {
    setUndone(null);
    setScore(playerId, holeNumber, score);
  };
  const nameOf = (id: string) => round.players.find((p) => p.id === id)?.name ?? 'Player';
  const describe = (id: string, score: GrossScore | undefined) => `${nameOf(id)} ${score === null ? 'pick up' : score == null ? 'blank' : score}`;

  // "Everyone par": fill only the players who have no score yet. Completing the hole auto-advances as usual.
  const unscored = round.players.filter((p) => !(p.id in scores));
  const fillPar = () => {
    if (unscored.length === 0) return;
    const fill: PlayerScores = {};
    for (const p of unscored) fill[p.id] = hole.par;
    setUndone(null);
    setScores(holeNumber, fill);
  };

  const lastUndo = undoStack[undoStack.length - 1];
  const undoLabel = lastUndo ? `Undo ${Object.keys(lastUndo.previous).map((id) => describe(id, scores[id] ?? round.holeResults.find((r) => r.holeNumber === lastUndo.holeNumber)?.scores[id])).join(', ')} on hole ${lastUndo.holeNumber}` : 'Nothing to undo';
  const undo = () => {
    const entry = undoLastScore();
    if (!entry) return;
    haptic.light();
    const who = Object.keys(entry.previous).map(nameOf).join(', ');
    setUndone(`Undid ${who} on hole ${entry.holeNumber}`);
  };

  const openNote = () => {
    setNoteDraft(result?.note ?? '');
    setNoteOpen(true);
  };
  const saveNote = (text: string) => {
    setHoleNote(holeNumber, text);
    setNoteOpen(false);
  };

  const yards = hole.yardage?.[round.teeBoxId];
  // Score chips wrap into a grid: five per row on a phone (fewer only if a chip would drop under 52pt wide; still above the 48pt target), so nothing scrolls sideways.
  const columns = gridWidth > 0 ? Math.max(1, Math.min(5, Math.floor((gridWidth + CHIP_GAP) / (52 + CHIP_GAP)))) : 5;
  const chipWidth = gridWidth > 0 ? Math.floor((gridWidth - CHIP_GAP * (columns - 1)) / columns) : undefined;
  const previous = order.slice(0, Math.max(0, position - 1));
  const options = scoreOptions(hole.par);
  const rotated = order[0]?.number !== holeNumber && (round.settings.startHole ?? order[0]?.number) !== order[0]?.number ? false : round.settings.startHole != null;

  return (
    <Screen noBottomInset>
      {/* Hole header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space[3], paddingBottom: space[2] }} accessibilityRole="header" accessibilityLabel={`Hole ${holeNumber}, par ${hole.par}, stroke index ${hole.strokeIndex}, ${position} of ${order.length}`}>
        <IconButton icon="chevron-back" label="Previous hole" size={52} disabled={prev == null} onPress={() => prev != null && setCurrentHole(prev)} />
        <Animated.View style={{ flex: 1, alignItems: 'center', transform: [{ scale: pop }] }}>
          <Text step="displayXl">Hole {holeNumber}</Text>
          <Text step="label" tone="secondary" tabular>
            {joinMeta([`Par ${hole.par}`, yards ? `${yards} yds` : null, `SI ${hole.strokeIndex}`, rotated ? `${position} of ${order.length}` : null])}
          </Text>
        </Animated.View>
        <IconButton icon="chevron-forward" label="Next hole" size={52} disabled={next == null} onPress={() => next != null && setCurrentHole(next)} />
      </View>

      {/* Progress ticks, in play order */}
      <View style={{ flexDirection: 'row', gap: 4, paddingTop: space[2], paddingBottom: space[3] }} accessibilityLabel={`${playedCount} of ${order.length} holes played`}>
        {order.map((h) => {
          const played = round.holeResults.some((r) => r.holeNumber === h.number && Object.keys(r.scores).length > 0);
          const current = h.number === holeNumber;
          return <View key={h.number} style={{ flex: 1, height: 6, borderRadius: radius.xs, backgroundColor: current ? c.accent : played ? c.accentSoft : c.tickUpcoming }} />;
        })}
      </View>

      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingTop: space[1], paddingBottom: layout.section }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Shortcuts: fill par, undo, note */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          {unscored.length > 0 ? (
            <Button label={unscored.length === round.players.length ? `Everyone par ${hole.par}` : `Rest par ${hole.par}`} variant="secondary" size="md" haptic onPress={fillPar} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <IconButton icon="arrow-undo-outline" label={undoLabel} size={48} disabled={!lastUndo} onPress={undo} />
          <IconButton icon={result?.note ? 'create' : 'create-outline'} label={result?.note ? 'Edit hole note' : 'Add a hole note'} size={48} onPress={openNote} />
        </View>
        {undone ? (
          <Text step="caption" tone="secondary" tabular={false} align="center">
            {undone}
          </Text>
        ) : null}
        {result?.note ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Hole note: ${result.note}. Edit`} onPress={openNote}>
            {({ pressed }) => (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.md, backgroundColor: c.accentTint, opacity: pressed ? 0.85 : 1 }}>
                <Ionicons name="document-text-outline" size={18} color={c.accentText} style={{ marginTop: 2 }} />
                <Text step="body" tone="accentTintText" style={{ flex: 1 }}>
                  {result.note}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}

        {round.players.map((p, i) => {
          const strokes = handicaps[p.id]?.strokesByHole[holeNumber] ?? 0;
          const saved = p.id in scores ? scores[p.id] : undefined;
          const t = totals(round.holeResults, previous, p.id, 'gross');
          return (
            <Card key={p.id} style={{ gap: space[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Avatar name={p.name} index={i} size={32} />
                <Text step="title" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {p.name}
                </Text>
                {strokes !== 0 ? <Badge label={strokes > 0 ? plural(strokes, 'stroke') : `gives ${Math.abs(strokes)}`} tone="positive" text="label" dot /> : null}
                <Text step="caption" tone="secondary" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
                  {t.holesScored > 0 ? `${t.strokes} · ${formatToPar(t.toPar)}` : 'First hole'}
                </Text>
              </View>
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CHIP_GAP }}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (Math.abs(w - gridWidth) > 1) setGridWidth(w);
                }}
              >
                {options.map((v) => (
                  <ScoreChip
                    key={v}
                    width={chipWidth}
                    value={String(v)}
                    caption={scoreChipLabel(v - hole.par)}
                    selected={saved === v}
                    onPress={() => change(p.id, v)}
                    accessibilityLabel={`${p.name}: ${v}, ${scoreChipLabel(v - hole.par)}`}
                  />
                ))}
                <ScoreChip width={chipWidth} value="–" caption="Pick up" selected={saved === null} onPress={() => change(p.id, null)} accessibilityLabel={`${p.name}: picked up, no score`} />
              </View>
            </Card>
          );
        })}
        {inputGames.map((r) => {
          const activeGame = round.games.find((g) => g.gameId === r.gameId);
          const participants = activeGame?.playerIds ? round.players.filter((pl) => activeGame.playerIds!.includes(pl.id)) : round.players;
          return <HoleInputCard key={r.gameId} mode={r.mode} participants={participants} answers={answersFor(r.gameId)} onAnswer={(k, v) => answer(r.gameId, k, v)} />;
        })}
        {unanswered.length > 0 && round.players.every((p) => p.id in scores) ? (
          <Text step="label" tone="secondary" align="center">
            Answer the game prompts to continue.
          </Text>
        ) : null}
      </ScrollView>

      <Sheet visible={noteOpen} onClose={() => setNoteOpen(false)} title={`Hole ${holeNumber} note`}>
        <View style={{ gap: space[3] }}>
          <TextField
            style={{ height: 96, alignItems: 'flex-start', paddingVertical: 12 }}
            inputStyle={{ height: '100%', textAlignVertical: 'top' }}
            placeholder="Lost ball left, press starts here, birdie on the island…"
            value={noteDraft}
            onChangeText={setNoteDraft}
            multiline
            maxLength={MAX_NOTE_LENGTH}
            autoFocus
            accessibilityLabel="Hole note"
          />
          <Text step="caption" tone="tertiary" tabular align="right">
            {noteDraft.length}/{MAX_NOTE_LENGTH}
          </Text>
          <Button label="Save note" onPress={() => saveNote(noteDraft)} />
          {result?.note ? <Button label="Remove note" variant="secondary" destructive onPress={() => saveNote('')} /> : <Button label="Cancel" variant="secondary" onPress={() => setNoteOpen(false)} />}
        </View>
      </Sheet>
    </Screen>
  );
}
