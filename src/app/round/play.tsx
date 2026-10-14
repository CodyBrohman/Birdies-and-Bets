import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { actionSheet, ask, Button, confirm, HeaderButton, Icon, Pressable, ScrollScreen, SegmentedControl, Text } from '@/components/ui';
import { NineCard } from '@/components/scorecard';
import { HoleInputCard, missingInputs } from '@/components/games';
import { HoleStrip, PlayerScore, type HoleProgress } from '@/components/round';
import { goBackOr } from '@/components/navigation';
import { haptic, PRESSED_OPACITY, useReduceMotion, useTheme } from '@/theme';
import { holePromptOf, useGameRuns, useHandicaps, useHoles, useMe, usePlayOrder, useRound, useRoundStore } from '@/store';
import type { GrossScore, Player, PlayerScores, ScoringBasis } from '@/types';
import { backNine, frontNine, holePosition, nextHoleNumber, prevHoleNumber, scoreOptions, stepScore, totals, unscoredHoles } from '@/lib/scoring';
import { formatToPar, joinMeta, shortNames } from '@/lib/format';
import { trackRoundDiscarded } from '@/services';

/**
 * The round in progress, one hole at a time. The header names the hole; under it the hole chips, a one-line standings
 * strip, and each player's −/number/+ (from no score: tap the number for par, − for a birdie, + for a bogey). Game
 * prompts appear when a game asks for them; the full card sits below. Previous / Next stay pinned in thumb reach, and
 * moving on is always manual. Every tap is saved at once.
 */
export default function PlayScreen() {
  const router = useRouter();
  const { c, w, space, motion } = useTheme();
  const reduceMotion = useReduceMotion();
  const round = useRound();
  const holes = useHoles(round);
  const order = usePlayOrder(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const { me } = useMe();
  const setScores = useRoundStore((s) => s.setScores);
  const clearScore = useRoundStore((s) => s.clearScore);
  const undoLastScore = useRoundStore((s) => s.undoLastScore);
  const recordHole = useRoundStore((s) => s.recordHole);
  const setCurrentHole = useRoundStore((s) => s.setCurrentHole);
  const setGameInputs = useRoundStore((s) => s.setGameInputs);
  const discardRound = useRoundStore((s) => s.discardRound);

  const scrollRef = useRef<ScrollView>(null);
  const [fade] = useState(() => new Animated.Value(1));
  const [basis, setBasis] = useState<ScoringBasis>('gross');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const holeNumber = round?.currentHole ?? order[0]?.number ?? 1;
  const hole = order.find((h) => h.number === holeNumber);
  if (!round || !hole) return null;

  const position = holePosition(order, holeNumber);
  const prev = prevHoleNumber(order, holeNumber);
  const next = nextHoleNumber(order, holeNumber);
  const result = round.holeResults.find((r) => r.holeNumber === holeNumber);
  const scores = result?.scores ?? {};
  const yards = hole.yardage?.[round.teeBoxId];
  const mine = round.players.find((p) => me && p.profileId === me.id);
  const isMe = (p: Player) => !!mine && p.id === mine.id;
  const maxScore = Math.max(...scoreOptions(hole.par));
  const anyStrokes = round.players.some((p) => Object.values(handicaps[p.id]?.strokesByHole ?? {}).some((n) => n !== 0));

  // Game prompts on this hole, with their saved answers.
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

  const showToast = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  const nameOf = (id: string) => round.players.find((p) => p.id === id)?.name ?? 'Player';
  const set = (playerId: string, score: GrossScore) => setScores(holeNumber, { [playerId]: score });
  const clear = (playerId: string) => {
    if (!(playerId in scores)) return;
    clearScore(playerId, holeNumber);
    showToast(`Cleared ${nameOf(playerId)} on hole ${holeNumber}`);
  };
  const step = (playerId: string, delta: 1 | -1) => {
    const saved = scores[playerId];
    const value = stepScore(saved, delta, hole.par, maxScore);
    if (saved === value) return;
    haptic.light();
    set(playerId, value);
  };
  const setPar = (playerId: string) => {
    if (scores[playerId] === hole.par) return;
    haptic.light();
    set(playerId, hole.par);
  };
  const pickUp = (playerId: string) => {
    if (scores[playerId] === null) return;
    haptic.light();
    set(playerId, null);
    showToast(`${nameOf(playerId)} picked up on hole ${holeNumber}`);
  };

  // "Everyone par" fills only the players who have no score yet.
  const unscored = round.players.filter((p) => !(p.id in scores));
  const fillPar = () => {
    if (unscored.length === 0) return;
    const fill: PlayerScores = {};
    for (const p of unscored) fill[p.id] = hole.par;
    haptic.light();
    setScores(holeNumber, fill);
    showToast(unscored.length === round.players.length ? `Everyone par on hole ${holeNumber}` : `Par for ${unscored.map((p) => p.name).join(', ')}`);
  };
  const undo = () => {
    const entry = undoLastScore();
    setToast(null);
    if (entry) haptic.light();
  };

  // Changing hole: back to the top, the hole's content fading in (not under Reduce Motion).
  const goTo = (n: number) => {
    setCurrentHole(n);
    setToast(null);
    scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });
    if (!reduceMotion) {
      fade.setValue(0.25);
      Animated.timing(fade, { toValue: 1, duration: motion.holeChange, useNativeDriver: true }).start();
    }
  };

  const goNext = async () => {
    // An open game prompt (a greenie, the wolf's pick) is easy to miss: offer to answer it, or skip for now.
    if (unanswered.length > 0 && round.players.every((p) => p.id in scores)) {
      const choice = await ask(`${unanswered.map((r) => r.mode.name).join(' and ')} not answered on hole ${holeNumber}`, 'You can come back to this hole and answer it later.', [
        { label: 'Answer now', value: 'answer', style: 'cancel' },
        { label: 'Skip for now', value: 'skip' },
      ]);
      if (choice !== 'skip') return;
    }
    if (Object.keys(scores).length > 0) recordHole(holeNumber, scores);
    haptic.light();
    if (next == null) await finish();
    else goTo(next);
  };

  const finish = async () => {
    const missing = unscoredHoles(round.holeResults, order, round.players.map((p) => p.id));
    if (missing.length > 0) {
      const ok = await confirm({
        title: missing.length === 1 ? `Hole ${missing[0]} has missing scores` : `${missing.length} holes have missing scores`,
        message: missing.length > 1 ? `Holes ${missing.join(', ')}. Finish anyway? Missing scores count as not played.` : 'Finish anyway? Missing scores count as not played.',
        confirmLabel: 'Finish round',
        cancelLabel: 'Keep scoring',
      });
      if (!ok) return;
    }
    router.push('/round/summary');
  };

  const endRound = async () => {
    const choice = await ask('End this round?', 'Finish it to see the results and save it, or discard it.', [
      { label: 'Finish round', value: 'finish' },
      { label: 'Discard round', value: 'discard', style: 'destructive' },
      { label: 'Cancel', value: null, style: 'cancel' },
    ]);
    if (choice === 'finish') await finish();
    if (choice === 'discard') {
      const ok = await confirm({ title: 'Discard this round?', message: `Every score from ${round.course.name} is deleted. This can't be undone.`, confirmLabel: 'Discard round', destructive: true });
      if (!ok) return;
      trackRoundDiscarded(round);
      discardRound();
      router.replace('/');
    }
  };

  const openMenu = async () => {
    const items = [
      { label: result?.note ? 'Edit hole note' : 'Add hole note', run: () => router.push('/round/note') },
      { label: round.games.length ? 'Edit games' : 'Add a game', run: () => router.push('/new-round/games?target=round') },
      { label: 'End round', run: () => void endRound() },
    ];
    const i = await actionSheet(undefined, items);
    if (i != null) items[i]?.run();
  };

  const progressOf = (n: number): HoleProgress => {
    const r = round.holeResults.find((x) => x.holeNumber === n);
    const count = r ? round.players.filter((p) => p.id in r.scores).length : 0;
    return count === 0 ? 'none' : count === round.players.length ? 'all' : 'some';
  };
  const soFar = (p: Player): string | null => {
    const t = totals(round.holeResults, order, p.id, 'gross');
    const thru = t.holesScored + t.holesPickedUp;
    return thru ? `${t.holesScored ? formatToPar(t.toPar) : 'PU'} thru ${thru}` : null;
  };
  const names = shortNames(round.players.map((p) => p.name));
  const standingsLine = runs.map((r) => `${r.mode.name}: ${r.standings.headline}`).join(' · ');
  const front = frontNine(holes);
  const back = backNine(holes);
  const holeFacts = joinMeta([`Par ${hole.par}`, yards ? `${yards} yds` : null, `SI ${hole.strokeIndex}`]);

  return (
    <ScrollScreen
      title={`Hole ${holeNumber}`}
      scrollRef={scrollRef}
      gap={space[4]}
      headerTitle={() => (
        <View accessible accessibilityRole="header" accessibilityLabel={`Hole ${holeNumber} of ${order.length}. Par ${hole.par}${yards ? `, ${yards} yards` : ''}, stroke index ${hole.strokeIndex}`} testID="current-hole" style={{ alignItems: 'center' }}>
          <Text step="rowTitle">Hole {holeNumber}</Text>
          <Text step="caption1" tone="secondary">
            {holeFacts}
          </Text>
        </View>
      )}
      headerLeft={() => <HeaderButton label="Close" onPress={() => goBackOr('/')} testID="round-home" />}
      headerRight={() => <HeaderButton label="Round options" icon="more" onPress={() => void openMenu()} testID="round-menu" />}
      footer={
        <>
          {toast ? (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingLeft: space[4], borderRadius: 12, backgroundColor: c.hero }}>
              <Text step="subhead" style={{ flex: 1, color: c.onHero }} numberOfLines={2}>
                {toast}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Undo: ${toast}`} onPress={undo} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: space[4], justifyContent: 'center', opacity: pressed ? PRESSED_OPACITY : 1 })}>
                <Text step="subhead" style={{ color: c.onHero, fontWeight: w.semibold }}>
                  Undo
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <Button label={prev != null ? `Hole ${prev}` : 'Previous'} accessibilityLabel={prev != null ? `Previous hole, hole ${prev}` : 'Previous hole'} variant="secondary" size="lg" disabled={prev == null} onPress={() => prev != null && goTo(prev)} style={{ flex: 1 }} />
            <Button label={next == null ? 'Finish round' : 'Next hole'} onPress={() => void goNext()} style={{ flex: 1.6 }} testID="next-hole" />
          </View>
        </>
      }
    >
      <HoleStrip order={order} current={holeNumber} progress={progressOf} onSelect={goTo} />

      {runs.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Standings. ${standingsLine}`}
          onPress={() => router.push('/round/standings')}
          testID="open-standings"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 48, paddingVertical: space[2], paddingHorizontal: space[4], borderRadius: 12, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.divider, opacity: pressed ? PRESSED_OPACITY : 1 })}
        >
          <Icon name="trophy" size="sm" color={c.goldText} />
          <Text step="subhead" style={{ flex: 1 }} numberOfLines={2}>
            {standingsLine}
          </Text>
          <Icon name="chevronRight" size={14} color={c.textTertiary} />
        </Pressable>
      ) : null}

      <Animated.View style={{ opacity: fade, gap: space[4] }}>
        <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
          {round.players.map((p, i) => (
            <View key={p.id} style={{ borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}>
              <PlayerScore
                player={p}
                shortName={names[i] ?? p.name}
                seat={i}
                you={isMe(p)}
                par={hole.par}
                value={p.id in scores ? scores[p.id] : undefined}
                strokes={handicaps[p.id]?.strokesByHole[holeNumber] ?? 0}
                progress={soFar(p)}
                max={maxScore}
                onStep={(d) => step(p.id, d)}
                onPar={() => setPar(p.id)}
                onPickUp={() => pickUp(p.id)}
                onClear={() => clear(p.id)}
                index={i}
              />
            </View>
          ))}
        </View>

        {unscored.length > 0 && round.players.length > 1 ? (
          <Button
            label={unscored.length === round.players.length ? 'Everyone par' : 'Rest par'}
            accessibilityLabel={unscored.length === round.players.length ? `Everyone par ${hole.par}` : `Par ${hole.par} for ${unscored.map((p) => p.name).join(', ')}`}
            variant="secondary"
            haptic={false}
            onPress={fillPar}
            testID="everyone-par"
          />
        ) : null}

        {result?.note ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Hole note: ${result.note}. Edit`} onPress={() => router.push('/round/note')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: 12, backgroundColor: c.accentTint, opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="note" size="sm" color={c.accentTintText} />
            <Text step="subhead" tone="accentTintText" style={{ flex: 1 }}>
              {result.note}
            </Text>
          </Pressable>
        ) : null}

        {inputGames.map((r) => {
          const activeGame = round.games.find((g) => g.gameId === r.gameId);
          const participants = activeGame?.playerIds ? round.players.filter((pl) => activeGame.playerIds!.includes(pl.id)) : round.players;
          const prompt = activeGame ? holePromptOf(round, activeGame, r.mode, holeNumber, handicaps) : undefined;
          return <HoleInputCard key={r.gameId} mode={r.mode} participants={participants} prompt={prompt} answers={answersFor(r.gameId)} onAnswer={(k, v) => answer(r.gameId, k, v)} />;
        })}
      </Animated.View>

      <View style={{ gap: space[3], marginTop: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text accessibilityRole="header" step="title3" style={{ flex: 1 }}>
            Scorecard
          </Text>
          {anyStrokes ? (
            <SegmentedControl
              accessibilityLabel="Scores shown"
              options={[
                { value: 'gross', label: 'Gross' },
                { value: 'net', label: 'Net' },
              ]}
              value={basis}
              onChange={setBasis}
              style={{ width: 150 }}
            />
          ) : null}
        </View>
        {front.length > 0 ? <NineCard label="Out" holes={front} players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} currentHole={holeNumber} isMe={isMe} onPressHole={goTo} /> : null}
        {back.length > 0 ? <NineCard label="In" holes={back} players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} currentHole={holeNumber} totalOver={front.length > 0 ? holes : undefined} isMe={isMe} onPressHole={goTo} /> : null}
        <Text step="footnote" tone="tertiary">
          {position} of {order.length} · Scores save as you enter them
        </Text>
      </View>
    </ScrollScreen>
  );
}
