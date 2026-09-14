import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { GameConfigSheet } from '@/components/games';
import { useTheme } from '@/theme';
import { fitReason, newActiveGame, useGameCatalog, useRoundStore } from '@/store';
import type { ActiveGame, GameMode } from '@/types';

/**
 * Game select. Browsable catalog split into betting and just-for-fun, multiple selectable, always skippable.
 * In edit mode (from the Games tab mid-round) it saves onto the active round instead of starting one.
 */
export default function GamesScreen() {
  const router = useRouter();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const editing = modeParam === 'edit';
  const { c, space, radius } = useTheme();
  const catalog = useGameCatalog();
  const draft = useRoundStore((s) => s.draft);
  const round = useRoundStore((s) => s.round);
  const startRound = useRoundStore((s) => s.startRound);
  const setGames = useRoundStore((s) => s.setGames);

  const players = editing && round ? round.players : draft.players;
  const stakeUnit = (editing && round ? round.settings.stakeLabel : 'points') === 'points' ? 'pts' : (round?.settings.stakeLabel ?? 'pts');

  const [selected, setSelected] = useState<ActiveGame[]>(() => (editing && round ? round.games : []));
  const [configFor, setConfigFor] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState<string | null>(null);

  const betting = useMemo(() => catalog.filter((g) => g.category === 'betting'), [catalog]);
  const social = useMemo(() => catalog.filter((g) => g.category === 'social'), [catalog]);

  const isOn = (id: string) => selected.some((g) => g.gameId === id);
  const toggle = (mode: GameMode) => {
    if (isOn(mode.id)) {
      setSelected(selected.filter((g) => g.gameId !== mode.id));
      return;
    }
    const playerIds = mode.participantCount ? players.slice(0, mode.participantCount).map((p) => p.id) : undefined;
    setSelected([...selected, newActiveGame(mode, playerIds)]);
    if (mode.configFields.length > 0 || mode.participantCount) setConfigFor(mode.id);
  };
  const update = (next: ActiveGame) => setSelected(selected.map((g) => (g.gameId === next.gameId ? next : g)));

  const incomplete = selected.filter((g) => {
    const m = catalog.find((x) => x.id === g.gameId);
    return m?.participantCount && (g.playerIds?.length ?? 0) !== m.participantCount;
  });

  const finish = (games: ActiveGame[]) => {
    if (editing) {
      setGames(games);
      router.back();
      return;
    }
    const r = startRound(games);
    if (r) router.replace('/round/play');
  };

  const configMode = configFor ? (catalog.find((g) => g.id === configFor) ?? null) : null;
  const configActive = configFor ? (selected.find((g) => g.gameId === configFor) ?? null) : null;

  return (
    <Screen noBottomInset>
      <SetupHeader title="Games" meta={`${players.length} players`} showBack />
      <ScrollView contentContainerStyle={{ gap: space[5], paddingBottom: space[4] }}>
        <Group title="Betting" bar={c.accent} games={betting} />
        <Group title="Just for fun" bar={c.positive} games={social} />
      </ScrollView>
      <View style={{ gap: space[2], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: c.divider }}>
        {selected.length > 0 ? (
          <Button
            label={editing ? `Save · ${selected.length} ${selected.length === 1 ? 'game' : 'games'}` : `Start round · ${selected.length} ${selected.length === 1 ? 'game' : 'games'}`}
            disabled={incomplete.length > 0}
            onPress={() => finish(selected)}
          />
        ) : null}
        <Button label={editing ? (selected.length ? 'Remove all games' : 'Keep it a scorecard') : 'Play without games'} variant={selected.length ? 'secondary' : 'primary'} onPress={() => finish([])} />
        {incomplete.length > 0 ? (
          <Text step="caption" tone="negative" tabular={false} align="center">
            Pick players for {incomplete.map((g) => catalog.find((x) => x.id === g.gameId)?.name).join(', ')}
          </Text>
        ) : null}
      </View>

      <GameConfigSheet mode={configMode} active={configActive} players={players} stakeLabel={stakeUnit} onChange={update} onClose={() => setConfigFor(null)} />
    </Screen>
  );

  function Group({ title, bar, games }: { title: string; bar: string; games: GameMode[] }) {
    return (
      <View style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <View style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: bar }} />
          <Text step="title" style={{ fontSize: 17, lineHeight: 22 }}>
            {title}
          </Text>
        </View>
        {games.map((mode) => {
          const reason = fitReason(mode, players.length);
          const on = isOn(mode.id);
          const activeGame = selected.find((g) => g.gameId === mode.id);
          const stake = activeGame && typeof activeGame.config.stake === 'number' ? activeGame.config.stake : 0;
          const participants = activeGame?.playerIds?.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean);
          const meta = on
            ? [stake ? `${stake} ${stakeUnit}` : 'No stake', mode.supportsNet ? activeGame?.basis.toUpperCase() : null, participants?.length ? participants.join(' vs ') : null]
                .filter(Boolean)
                .join(' · ')
            : mode.category === 'betting'
              ? 'Points, gross or net'
              : 'No stake';
          const open = rulesOpen === mode.id;
          return (
            <View
              key={mode.id}
              style={{
                backgroundColor: c.surfaceRaised,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: on ? c.accent : c.divider,
                opacity: reason ? 0.5 : 1,
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'stretch', minHeight: 64 }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: !!reason }}
                  accessibilityLabel={mode.name}
                  disabled={!!reason}
                  onPress={() => toggle(mode)}
                  style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], backgroundColor: pressed ? c.accentTint : 'transparent' })}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: on ? c.accent : c.divider,
                      backgroundColor: on ? c.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on ? (
                      <Text step="label" tone="onAccent">
                        ✓
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text step="bodyStrong">{mode.name}</Text>
                    <Text step="label" tone="secondary">
                      {reason ?? mode.blurb}
                    </Text>
                  </View>
                </Pressable>
                {on && (mode.configFields.length > 0 || mode.participantCount) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Configure ${mode.name}`}
                    onPress={() => setConfigFor(mode.id)}
                    style={({ pressed }) => ({ width: 56, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: c.divider, backgroundColor: pressed ? c.accentTint : 'transparent' })}
                  >
                    <Text step="headline" style={{ color: c.accent }}>
                      ⚙
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: space[3], borderTopWidth: 1, borderTopColor: c.divider }}>
                <Text step="caption" tone="secondary" style={{ flex: 1 }} tabular={false} numberOfLines={1}>
                  {meta}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Hide' : 'Show'} ${mode.name} rules`} onPress={() => setRulesOpen(open ? null : mode.id)} hitSlop={8} style={{ paddingVertical: 8 }}>
                  <Text step="caption" tone="accent" tabular={false}>
                    Rules {open ? '⌃' : '⌄'}
                  </Text>
                </Pressable>
              </View>
              {open ? (
                <View style={{ paddingHorizontal: space[3], paddingBottom: space[3] }}>
                  <Text step="label" tone="secondary">
                    {mode.rules}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }
}
