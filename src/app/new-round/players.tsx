import { useCallback, useMemo } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Screen, Segmented, Text, TextField } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { useTheme } from '@/theme';
import { useRoundStore } from '@/store';
import type { Player } from '@/types';
import { computePlayerRoundState, describeStrokes, holesInPlay } from '@/lib/handicap';
import { formatSigned } from '@/lib/format';
import { newId } from '@/lib/id';

const MAX_PLAYERS = 4;

/** Parse "8.2" or "+1.8" (plus handicap → negative index). Undefined when blank or invalid. */
function parseIndex(raw: string): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const plus = s.startsWith('+');
  const n = Number(s.replace(/^\+/, ''));
  if (!Number.isFinite(n)) return undefined;
  return plus ? -n : n;
}

/** Player setup: 1–4 rows with name + index. Course handicap and strokes appear the moment an index exists. */
export default function PlayersScreen() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const draft = useRoundStore((s) => s.draft);
  const setDraftPlayers = useRoundStore((s) => s.setDraftPlayers);
  const setDraftHoleCount = useRoundStore((s) => s.setDraftHoleCount);
  const recentPlayers = useRoundStore((s) => s.recentPlayers);

  const course = draft.course;
  const teeBoxId = draft.teeBoxId ?? '';
  const tee = course?.teeBoxes.find((t) => t.id === teeBoxId);

  // Only while focused: starting a round clears the draft, and this screen stays mounted underneath.
  useFocusEffect(
    useCallback(() => {
      if (!course) {
        router.replace('/new-round/course');
        return;
      }
      if (draft.players.length === 0) {
        setDraftPlayers([{ id: newId('p'), name: '', teeBoxId }, { id: newId('p'), name: '', teeBoxId }]);
      }
    }, [course, draft.players.length, router, setDraftPlayers, teeBoxId]),
  );

  const holes = useMemo(() => (course ? holesInPlay(course, draft.holeCount) : []), [course, draft.holeCount]);

  const patch = (id: string, p: Partial<Player>) => setDraftPlayers(draft.players.map((pl) => (pl.id === id ? { ...pl, ...p } : pl)));
  const remove = (id: string) => setDraftPlayers(draft.players.filter((pl) => pl.id !== id));
  const add = (from?: Player) => {
    if (draft.players.length >= MAX_PLAYERS) return;
    setDraftPlayers([...draft.players, { id: newId('p'), name: from?.name ?? '', handicapIndex: from?.handicapIndex, teeBoxId }]);
  };

  const full = draft.players.length >= MAX_PLAYERS;
  const named = draft.players.filter((p) => p.name.trim().length > 0);
  // One name is enough. Blank rows are dropped on continue rather than blocking it.
  const canContinue = named.length >= 1;
  const continueToGames = () => {
    Keyboard.dismiss();
    if (named.length !== draft.players.length) setDraftPlayers(named);
    router.push('/new-round/games');
  };
  const recentAvailable = recentPlayers.filter((rp) => !draft.players.some((p) => p.name.trim().toLowerCase() === rp.name.trim().toLowerCase()));

  if (!course) return null;

  return (
    <Screen noBottomInset>
      <SetupHeader title="Players" meta={tee ? `${course.name.split(' ')[0]} · ${tee.name}` : course.name} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[4] }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {course.holes.length >= 18 ? (
            <Segmented
              options={[
                { value: '18', label: '18 holes' },
                { value: '9', label: 'Front 9' },
              ]}
              value={String(draft.holeCount)}
              onChange={(v) => setDraftHoleCount(v === '9' ? 9 : 18)}
              accessibilityLabel="Hole count"
            />
          ) : null}

          {draft.players.map((p, i) => {
            const state = computePlayerRoundState(p, course, { holeCount: draft.holeCount, allowance: 100 });
            const hasIndex = p.handicapIndex != null;
            return (
              <View key={p.id} style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: c.divider, padding: space[3], gap: space[2] }}>
                <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                  <TextField
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder={`Player ${i + 1}`}
                    value={p.name}
                    onChangeText={(name) => patch(p.id, { name })}
                    accessibilityLabel={`Player ${i + 1} name`}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  <IndexField value={p.handicapIndex} onChange={(handicapIndex) => patch(p.id, { handicapIndex })} label={`Player ${i + 1} handicap index`} />
                  {draft.players.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove player ${i + 1}`}
                      onPress={() => remove(p.id)}
                      hitSlop={6}
                      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: pressed ? c.accentTint : 'transparent' })}
                    >
                      <Text step="headline" tone="secondary">
                        ✕
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], borderTopWidth: 1, borderTopColor: c.divider, paddingTop: space[2] }}>
                  <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: hasIndex ? c.accent : c.divider }} />
                  {hasIndex ? (
                    <Text step="label" tone="secondary" style={{ flex: 1 }}>
                      Course hcp{' '}
                      <Text step="label" tabular>
                        {formatSigned(state.courseHandicap)}
                      </Text>
                      {draft.holeCount === 9 ? ` · playing ${formatSigned(state.playingHandicap)}` : ''} · {describeStrokes(state, holes)}
                    </Text>
                  ) : (
                    <Text step="label" tone="secondary" style={{ flex: 1 }}>
                      {tee && (tee.rating == null || tee.slope == null) ? 'No rating on this tee — playing gross' : 'Playing gross — no strokes'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {!full ? (
            <Button label="Add player" variant="secondary" onPress={() => add()} />
          ) : null}

          {recentAvailable.length > 0 ? (
            <View style={{ gap: space[2] }}>
              <Text step="label" tone="secondary">
                Recent players
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                {recentAvailable.map((rp) => (
                  <Pressable
                    key={rp.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${rp.name}`}
                    disabled={full}
                    onPress={() => add(rp)}
                    style={({ pressed }) => ({
                      height: 44,
                      paddingHorizontal: 14,
                      borderRadius: radius.pill,
                      borderWidth: 1.5,
                      borderColor: pressed ? c.accent : c.divider,
                      backgroundColor: pressed ? c.accentTint : c.surfaceRaised,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      opacity: full ? 0.5 : 1,
                    })}
                  >
                    <Text step="label" tone="accent">
                      +
                    </Text>
                    <Text step="label">{rp.name}</Text>
                  </Pressable>
                ))}
              </View>
              {full ? (
                <Text step="caption" tone="secondary" tabular={false}>
                  Group is full at {MAX_PLAYERS} — remove a player to add another.
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
        {/* Footer lives inside the keyboard-avoiding view so it rises above the keyboard. */}
        <View style={{ paddingVertical: space[3], borderTopWidth: 1, borderTopColor: c.divider, gap: space[2] }}>
          {!canContinue ? (
            <Text step="caption" tone="secondary" tabular={false} align="center">
              Enter at least one name to continue
            </Text>
          ) : null}
          <Button label="Choose games" disabled={!canContinue} onPress={continueToGames} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Text field that keeps its own string so "+1." and "8." can be typed, committing a parsed number upward. */
function IndexField({ value, onChange, label }: { value: number | undefined; onChange: (v: number | undefined) => void; label: string }) {
  const initial = value == null ? '' : value < 0 ? `+${Math.abs(value)}` : String(value);
  return (
    <TextField
      style={{ width: 96, textAlign: 'center' }}
      placeholder="Index"
      defaultValue={initial}
      onChangeText={(raw) => onChange(parseIndex(raw))}
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
      accessibilityLabel={label}
      maxLength={5}
    />
  );
}
