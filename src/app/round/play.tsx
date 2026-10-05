import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, Badge, Button, Card, IconButton, LivePill, Screen, Sheet, Text, TextField, Pressable } from '@/components/ui';
import { NineCard } from '@/components/scorecard';
import { HoleInputCard, missingInputs } from '@/components/games';
import { haptic, useTheme } from '@/theme';
import { MAX_NOTE_LENGTH, useGameRuns, useHandicaps, useMe, usePlayOrder, useRound, useRoundStore } from '@/store';
import type { GrossScore, Player, PlayerScores, Round } from '@/types';
import { backNine, frontNine, holePosition, holesPlayed, nextHoleNumber, prevHoleNumber, scoreOn, scoreOptions, totals } from '@/lib/scoring';
import { formatIndex, formatToPar, joinMeta, plural } from '@/lib/format';
import { dayLabel, formatSlot, parseTeeTime } from '@/lib/teeTime';

/**
 * The live scorecard, one scrolling screen: round header, hole strip, a −/+ stepper per player, the front and back nine,
 * then Previous / Next hole. Every tap persists immediately. Moving on is manual: Next records the hole and steps
 * to the next one in play order (which wraps around on a shotgun start); on the last hole it finishes the round.
 */
const HOLE_CHIP = 48;
const HOLE_GAP = 8;

export default function PlayScreen() {
  const router = useRouter();
  const { c, f, space, radius, layout } = useTheme();
  const round = useRound();
  const order = usePlayOrder(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const { me } = useMe();
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

  const [undone, setUndone] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const strip = useRef<ScrollView>(null);
  const [stripWidth, setStripWidth] = useState(0);

  // Keep the current hole's chip in view.
  useEffect(() => {
    if (!stripWidth || position < 1) return;
    const x = (position - 1) * (HOLE_CHIP + HOLE_GAP) - (stripWidth - HOLE_CHIP) / 2;
    strip.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [position, stripWidth]);

  if (!round || !hole) return null;

  const played = holesPlayed(round.holeResults, order);
  const coursePar = order.reduce((sum, h) => sum + h.par, 0);
  const mine = round.players.find((p) => me && p.profileId === me.id) ?? round.players[0];
  const myTotals = mine ? totals(round.holeResults, order, mine.id, 'gross') : null;
  const isMe = (p: Player) => p.id === mine?.id && !!me && p.profileId === me.id;

  // Games that need more than strokes on this hole, with their saved answers.
  const inputGames = runs.filter((r) => (r.mode.holeInputs?.length ?? 0) > 0);
  const answersFor = (gameId: string) => result?.gameInputs?.[gameId] ?? {};
  const unanswered = inputGames.filter((r) => missingInputs(r.mode.holeInputs ?? [], answersFor(r.gameId)).length > 0);

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

  // Stepper: blank (or picked up) starts at par on the first tap, then moves one stroke at a time.
  const maxScore = Math.max(...scoreOptions(hole.par));
  const step = (playerId: string, delta: number) => {
    const saved = scores[playerId];
    const value = saved == null ? hole.par : Math.max(1, Math.min(maxScore, saved + delta));
    if (saved === value) return;
    haptic.light();
    change(playerId, value);
  };

  // "Everyone par": fill only the players who have no score yet.
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

  const goNext = () => {
    if (Object.keys(scores).length > 0) recordHole(holeNumber, scores);
    haptic.light();
    if (next == null) router.push('/round/summary');
    else setCurrentHole(next);
  };

  const front = frontNine(order).sort((a, b) => a.number - b.number);
  const back = backNine(order).sort((a, b) => a.number - b.number);
  const labelFor = (p: Player) => (isMe(p) ? 'You' : (p.name.trim().split(/\s+/)[0] ?? p.name));
  const onHeroLine = 'rgba(255,255,255,0.16)';

  return (
    <Screen>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space[2], paddingBottom: space[1] }}>
        <IconButton icon="chevron-back" label="Home" variant="plain" onPress={() => router.navigate('/')} testID="round-home" />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <LivePill label="Round in progress" live style={{ alignSelf: 'center', backgroundColor: 'transparent' }} />
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingTop: space[3], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ gap: 6 }}>
          <Text step="eyebrow" tone="accent">
            Your scorecard
          </Text>
          <Text accessibilityRole="header" step="display" style={{ fontSize: 28, lineHeight: 33 }}>
            {round.course.name}
          </Text>
          <Text step="body" tone="tertiary">
            {joinMeta([round.course.location, whenLabel(round)])}
          </Text>
        </View>

        {/* Live round card */}
        <View style={{ backgroundColor: c.hero, borderRadius: radius.hero, padding: space[4], gap: space[4], marginTop: space[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3] }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text step="eyebrow" style={{ color: c.onHeroSoft, fontSize: 10 }}>
                Live round
              </Text>
              <Text step="title" style={{ color: c.onHero, fontSize: 18, lineHeight: 23 }}>
                {joinMeta([plural(order.length, 'hole'), `Par ${coursePar}`])}
              </Text>
              {runs.length > 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Game standings, ${plural(runs.length, 'game')}`} onPress={() => router.push('/round/standings')} hitSlop={10} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  {({ pressed }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.14)' }}>
                      <Ionicons name="trophy-outline" size={13} color={c.goldFill} />
                      <Text step="caption" tabular={false} style={{ color: c.onHero, fontFamily: f.uiSemibold, fontSize: 12 }}>
                        {plural(runs.length, 'game')} · standings
                      </Text>
                    </View>
                  )}
                </Pressable>
              ) : null}
            </View>
            <View accessible accessibilityLabel={`Hole ${holeNumber}`} testID="current-hole" style={{ width: 58, height: 58, borderRadius: radius.lg, backgroundColor: c.goldFill, alignItems: 'center', justifyContent: 'center' }}>
              <Text step="total" style={{ color: c.textPrimary, fontSize: 22, lineHeight: 26 }}>
                {String(holeNumber).padStart(2, '0')}
              </Text>
              <Text step="overline" style={{ color: c.textPrimary, fontSize: 8, lineHeight: 10 }}>
                Hole
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {[
              { label: 'Your score', value: myTotals?.holesScored ? String(myTotals.strokes) : '–' },
              { label: 'To par', value: myTotals?.holesScored ? formatToPar(myTotals.toPar) : '–' },
              { label: 'Holes played', value: String(played), of: `/${order.length}` },
            ].map((s, i) => (
              <View key={s.label} accessible accessibilityLabel={`${s.label} ${s.value}${s.of ?? ''}`} style={{ flex: 1, gap: 6, paddingLeft: i === 0 ? 0 : space[3], borderLeftWidth: i === 0 ? 0 : 1, borderColor: onHeroLine }}>
                <Text step="overline" style={{ color: c.onHeroSoft, fontSize: 9 }}>
                  {s.label}
                </Text>
                <Text step="total" style={{ color: c.onHero, fontSize: 22, lineHeight: 26 }}>
                  {s.value}
                  {s.of ? <Text step="caption" style={{ color: c.onHeroSoft, fontSize: 12 }}>{s.of}</Text> : null}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hole by hole */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space[3] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text step="headline">Hole by hole</Text>
            <Text step="caption" tone="tertiary" tabular={false}>
              Tap a hole to enter scores.
            </Text>
          </View>
          <Badge label={`Par ${hole.par}`} tone="accent" />
        </View>
        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}
          contentContainerStyle={{ gap: HOLE_GAP }}
          style={{ flexGrow: 0 }}
        >
          {order.map((h) => {
            const current = h.number === holeNumber;
            const s = mine ? scoreOn(round.holeResults, mine.id, h.number, 'gross') : undefined;
            const scored = s !== undefined;
            return (
              <Pressable
                key={h.number}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                accessibilityLabel={`Hole ${h.number}, par ${h.par}${scored ? `, ${s === null ? 'picked up' : `scored ${s}`}` : ''}`}
                onPress={() => setCurrentHole(h.number)}
                style={({ pressed }) => ({
                  width: HOLE_CHIP,
                  height: 58,
                  borderRadius: radius.chip,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  backgroundColor: current ? c.accent : c.surfaceRaised,
                  borderWidth: current ? 0 : 1,
                  borderColor: c.divider,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text step="overline" style={{ fontSize: 9, color: current ? c.onAccent : c.textTertiary }}>
                  {String(h.number).padStart(2, '0')}
                </Text>
                <Text step="total" style={{ fontSize: 17, lineHeight: 21, color: current ? c.goldFill : scored ? c.textPrimary : c.textTertiary }}>
                  {s === null ? 'PU' : scored ? s : h.par}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Enter scores */}
        <Card style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingBottom: space[3], borderBottomWidth: 1, borderColor: c.divider }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text step="headline" style={{ fontSize: 19, lineHeight: 24 }}>
                Enter scores
              </Text>
              <Text step="caption" tone="tertiary">
                {joinMeta([`Hole ${holeNumber}`, `Par ${hole.par}`, `SI ${hole.strokeIndex}`, hole.yardage?.[round.teeBoxId] ? `${hole.yardage[round.teeBoxId]} yds` : null])}
              </Text>
            </View>
            <IconButton icon={result?.note ? 'create' : 'create-outline'} label={result?.note ? 'Edit hole note' : 'Add a hole note'} variant="plain" onPress={openNote} />
          </View>

          {round.players.map((p, i) => {
            const strokes = handicaps[p.id]?.strokesByHole[holeNumber] ?? 0;
            const saved = p.id in scores ? scores[p.id] : undefined;
            const shown = saved === undefined ? '–' : saved === null ? 'PU' : String(saved);
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <Avatar name={p.name} index={i} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text step="bodyStrong" numberOfLines={1}>
                    {p.name}
                    {isMe(p) ? ' (you)' : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
                    <Text step="caption" tone="tertiary">
                      HCP {formatIndex(p.handicapIndex)}
                      {strokes !== 0 ? <Text step="caption" tone="accent">{` · ${strokes > 0 ? `+${plural(strokes, 'stroke')}` : `gives ${Math.abs(strokes)}`}`}</Text> : null}
                    </Text>
                    <Pressable accessibilityRole="button" accessibilityState={{ selected: saved === null }} accessibilityLabel={`${p.name}: pick up, no score`} onPress={() => change(p.id, null)} hitSlop={10}>
                      <Text step="caption" tabular={false} tone={saved === null ? 'accent' : 'secondary'} style={{ fontFamily: f.uiSemibold, textDecorationLine: saved === null ? 'none' : 'underline' }}>
                        {saved === null ? 'Picked up' : 'Pick up'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={`${p.name} strokes`}
                  accessibilityValue={{ text: saved === undefined ? 'no score' : saved === null ? 'picked up' : String(saved) }}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                  onAccessibilityAction={(e) => step(p.id, e.nativeEvent.actionName === 'increment' ? 1 : -1)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}
                >
                  <StepButton icon="remove" label={`${p.name} one fewer`} disabled={saved != null && saved <= 1} onPress={() => step(p.id, -1)} testID={`stepper-minus-${i}`} />
                  <View style={{ minWidth: 40, alignItems: 'center' }}>
                    <Text step="total" style={{ fontSize: 20, lineHeight: 24, color: saved === undefined ? c.textTertiary : c.textPrimary }}>
                      {shown}
                    </Text>
                    <Text step="overline" tone="tertiary" style={{ fontSize: 8, lineHeight: 10 }}>
                      Strokes
                    </Text>
                  </View>
                  <StepButton icon="add" label={`${p.name} one more`} accent disabled={saved != null && saved >= maxScore} onPress={() => step(p.id, 1)} testID={`stepper-plus-${i}`} />
                </View>
              </View>
            );
          })}

          {/* Shortcuts: fill par, undo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingTop: space[3], borderTopWidth: 1, borderColor: c.divider }}>
            {unscored.length > 0 ? (
              <Button label={unscored.length === round.players.length ? `Everyone par ${hole.par}` : `Rest par ${hole.par}`} variant="tinted" size="sm" haptic onPress={fillPar} style={{ flex: 1 }} />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <IconButton icon="arrow-undo-outline" label={undoLabel} disabled={!lastUndo} onPress={undo} />
          </View>
          {undone ? (
            <Text step="caption" tone="secondary" tabular={false} align="center">
              {undone}
            </Text>
          ) : null}
        </Card>

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

        {inputGames.map((r) => {
          const activeGame = round.games.find((g) => g.gameId === r.gameId);
          const participants = activeGame?.playerIds ? round.players.filter((pl) => activeGame.playerIds!.includes(pl.id)) : round.players;
          return <HoleInputCard key={r.gameId} mode={r.mode} participants={participants} answers={answersFor(r.gameId)} onAnswer={(k, v) => answer(r.gameId, k, v)} />;
        })}
        {unanswered.length > 0 && round.players.every((p) => p.id in scores) ? (
          <Text step="label" tone="secondary" align="center">
            Answer the game prompts before you move on.
          </Text>
        ) : null}

        {/* Scorecard overview */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space[3] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text step="headline">Scorecard overview</Text>
            <Text step="caption" tone="tertiary" tabular={false}>
              Scores save as you enter them.
            </Text>
          </View>
          {runs.length > 0 ? <IconButton icon="stats-chart" label="Game standings" variant="plain" color={c.accentText} onPress={() => router.push('/round/standings')} /> : <Ionicons name="stats-chart" size={20} color={c.accentText} />}
        </View>
        {front.length > 0 ? <NineCard title="Front nine" holes={front} players={round.players} results={round.holeResults} currentHole={holeNumber} labelFor={labelFor} onPressHole={setCurrentHole} /> : null}
        {back.length > 0 ? <NineCard title="Back nine" holes={back} players={round.players} results={round.holeResults} currentHole={holeNumber} labelFor={labelFor} onPressHole={setCurrentHole} /> : null}

        {/* Previous / Next */}
        <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[4] }}>
          <Button label="Previous" variant="secondary" icon="arrow-back" disabled={prev == null} onPress={() => prev != null && setCurrentHole(prev)} style={{ flex: 1 }} />
          <Button label={next == null ? 'Finish round' : 'Next hole'} icon={next == null ? 'flag' : 'arrow-forward'} onPress={goNext} style={{ flex: 1.4 }} testID="next-hole" />
        </View>
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

/** "Today at 8:30 AM": the planned tee time when there is one, else when the round was started. */
function whenLabel(round: Round): string {
  const now = new Date();
  const tee = parseTeeTime(round.settings.teeTime);
  if (tee) return `${dayLabel(tee.day, now)} at ${formatSlot(tee.slot)}`;
  const started = new Date(round.createdAt);
  if (Number.isNaN(started.getTime())) return '';
  const slot = `${started.getHours()}:${String(started.getMinutes()).padStart(2, '0')}`;
  const sameDay = started.toDateString() === now.toDateString();
  return `${sameDay ? 'Today' : started.toLocaleDateString(undefined, { weekday: 'long' })} at ${formatSlot(slot)}`;
}

/** The mockup's 40pt rounded-square − / + buttons (48pt touch target with hitSlop). */
function StepButton({ icon, label, accent, disabled, onPress, testID }: { icon: 'add' | 'remove'; label: string; accent?: boolean; disabled?: boolean; onPress: () => void; testID?: string }) {
  const { c, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: accent ? (pressed ? c.accentSoft : c.accentTint) : pressed ? c.dividerSoft : c.neutralChip,
        opacity: disabled ? 0.35 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={accent ? c.accentText : c.textPrimary} />
    </Pressable>
  );
}
