import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Footer, IconButton, Screen, SectionLabel, Segmented, Stepper, Text, Pressable } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { goBackOr } from '@/components/navigation';
import { GameConfigSheet } from '@/components/games';
import { RoundSettingsSheet } from '@/components/round';
import { holesInPlay } from '@/lib/handicap';
import { useTheme } from '@/theme';
import { fitReason, newActiveGame, participantCountOf, sidesLabel, useGameCatalog, useRoundStore } from '@/store';
import type { ActiveGame, GameMode } from '@/types';
import { isSymbolLabel } from '@/lib/format';
import { trackRoundStarted } from '@/services';

/**
 * Game select. Betting and just-for-fun, multiple selectable, always skippable. Basis and stake are
 * set inline on the card; anything richer opens the config sheet.
 * In edit mode (from the Games tab mid-round) it saves onto the active round instead of starting one.
 */
export default function GamesScreen() {
  const router = useRouter();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const editing = modeParam === 'edit';
  const { c, space, radius, layout } = useTheme();
  const catalog = useGameCatalog();
  const draft = useRoundStore((s) => s.draft);
  const round = useRoundStore((s) => s.round);
  const startRound = useRoundStore((s) => s.startRound);
  const setGames = useRoundStore((s) => s.setGames);
  const setDraftSettings = useRoundStore((s) => s.setDraftSettings);
  const updateSettings = useRoundStore((s) => s.updateSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const players = editing && round ? round.players : draft.players;
  const settings = editing && round ? round.settings : draft.settings;
  const stakeLabel = settings.stakeLabel;
  const settingsCourse = editing && round ? round.course : draft.course;
  const settingsHoles = settingsCourse ? holesInPlay(settingsCourse, settings.holeCount, settings.nine) : [];
  const scored = !!round && round.holeResults.some((h) => Object.keys(h.scores).length > 0);
  const settingsLine = [
    `${settings.allowance}% allowance`,
    stakeLabel === 'points' ? 'points' : `stakes in ${stakeLabel}`,
    settings.startHole ? `shotgun from ${settings.startHole}` : `from hole ${settingsHoles[0]?.number ?? 1}`,
  ].join(' · ');
  const symbol = isSymbolLabel(stakeLabel);

  const [selected, setSelected] = useState<ActiveGame[]>(() => (editing && round ? round.games : []));
  const [configFor, setConfigFor] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState<string | null>(null);

  const betting = useMemo(() => catalog.filter((g) => g.category === 'betting'), [catalog]);
  const social = useMemo(() => catalog.filter((g) => g.category === 'social'), [catalog]);

  const isOn = (id: string) => selected.some((g) => g.gameId === id);
  const needsSheet = (mode: GameMode) => !!mode.participantCount || !!mode.participantCountFor || mode.configFields.some((f) => !(f.type === 'number' && f.key === 'stake'));
  const toggle = (mode: GameMode) => {
    if (isOn(mode.id)) {
      setSelected(selected.filter((g) => g.gameId !== mode.id));
      return;
    }
    const fresh = newActiveGame(mode);
    const count = participantCountOf(mode, fresh);
    const playerIds = count ? players.slice(0, count).map((p) => p.id) : undefined;
    setSelected([...selected, { ...fresh, playerIds }]);
    if (needsSheet(mode)) setConfigFor(mode.id);
  };
  const update = (next: ActiveGame) => setSelected(selected.map((g) => (g.gameId === next.gameId ? next : g)));

  const incomplete = selected.filter((g) => {
    const m = catalog.find((x) => x.id === g.gameId);
    if (!m) return false;
    const count = participantCountOf(m, g);
    if (count && (g.playerIds?.length ?? 0) !== count) return true;
    // 2 v 2 needs team A picked.
    return sidesLabel(m, g, players) === 'Pick the teams';
  });

  const finish = (games: ActiveGame[]) => {
    if (editing) {
      setGames(games);
      goBackOr('/round/standings');
      return;
    }
    const r = startRound(games);
    if (r) {
      trackRoundStarted(r);
      router.replace('/round/play');
    }
  };

  const configMode = configFor ? (catalog.find((g) => g.id === configFor) ?? null) : null;
  const configActive = configFor ? (selected.find((g) => g.gameId === configFor) ?? null) : null;
  const summary =
    selected.length === 0
      ? 'No games — just a scorecard'
      : `${selected.length} ${selected.length === 1 ? 'game' : 'games'} active: ${selected
          .map((g) => {
            const m = catalog.find((x) => x.id === g.gameId);
            return m ? `${m.name}${m.supportsNet ? ` (${g.basis})` : ''}` : '';
          })
          .filter(Boolean)
          .join(', ')}`;

  return (
    <Screen noBottomInset>
      <SetupHeader title="Games" meta={editing ? 'Edit' : 'Step 3 of 3'} fallback={editing ? '/round/standings' : '/bet'} />
      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingBottom: layout.section }} showsVerticalScrollIndicator={false}>
        <Card accessibilityLabel={`Round settings: ${settingsLine}`} onPress={() => setSettingsOpen(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Ionicons name="options-outline" size={22} color={c.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text step="title">Round settings</Text>
              <Text step="caption" tone="secondary" tabular={false} numberOfLines={2}>
                {settingsLine}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
          </View>
        </Card>
        <SectionLabel dot="accent" style={{ marginTop: layout.section - layout.stack }}>
          Betting games
        </SectionLabel>
        {betting.map((mode) => (
          <GameCard key={mode.id} mode={mode} />
        ))}
        <SectionLabel dot="gold" style={{ marginTop: layout.section - layout.stack }}>
          Just for fun
        </SectionLabel>
        {social.map((mode) => (
          <GameCard key={mode.id} mode={mode} />
        ))}
      </ScrollView>

      <Footer hint={incomplete.length > 0 ? undefined : summary}>
        {incomplete.length > 0 ? (
          <Text step="caption" tone="negative" tabular={false} align="center">
            Pick players or teams for {incomplete.map((g) => catalog.find((x) => x.id === g.gameId)?.name).join(', ')}
          </Text>
        ) : null}
        <Button label={editing ? 'Save' : 'Tee off'} disabled={incomplete.length > 0} onPress={() => finish(selected)} />
      </Footer>

      <GameConfigSheet mode={configMode} active={configActive} players={players} stakeLabel={stakeLabel} onChange={update} onClose={() => setConfigFor(null)} />
      <RoundSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        holes={settingsHoles}
        allowStartHole={!scored}
        onChange={(patch) => (editing ? updateSettings(patch) : setDraftSettings(patch))}
      />
    </Screen>
  );

  function GameCard({ mode }: { mode: GameMode }) {
    const reason = fitReason(mode, players.length);
    const on = isOn(mode.id);
    const activeGame = selected.find((g) => g.gameId === mode.id);
    const stakeField = mode.configFields.find((f) => f.key === 'stake' && f.type === 'number');
    const stake = activeGame && typeof activeGame.config.stake === 'number' ? activeGame.config.stake : stakeField && stakeField.type === 'number' ? stakeField.default : 0;
    const sides = activeGame ? sidesLabel(mode, activeGame, players) : null;
    const open = rulesOpen === mode.id;
    const hint = sides ?? '';
    return (
      <Card selected={on} style={{ opacity: reason ? 0.4 : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[2] }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: !!reason }}
            accessibilityLabel={mode.name}
            disabled={!!reason}
            onPress={() => toggle(mode)}
            style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
          >
            <Text step="title">{mode.name}</Text>
            <Text step="label" tone="secondary" style={{ marginTop: 2 }}>
              {reason ?? mode.blurb}
            </Text>
          </Pressable>
          {on && needsSheet(mode) ? <IconButton icon="settings-outline" label={`Configure ${mode.name}`} variant="plain" onPress={() => setConfigFor(mode.id)} /> : null}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: !!reason }}
            accessibilityLabel={`${on ? 'Remove' : 'Add'} ${mode.name}`}
            disabled={!!reason}
            onPress={() => toggle(mode)}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.pill,
                backgroundColor: on ? c.accent : 'transparent',
                borderWidth: on ? 0 : 2,
                borderColor: c.dividerSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {on ? <Ionicons name="checkmark" size={18} color={c.onAccent} /> : null}
            </View>
          </Pressable>
        </View>

        {on && activeGame && (mode.supportsNet || stakeField) ? (
          <View style={{ marginTop: space[4], gap: space[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              {mode.supportsNet ? (
                <Segmented
                  compact
                  options={[
                    { value: 'net', label: 'Net' },
                    { value: 'gross', label: 'Gross' },
                  ]}
                  value={activeGame.basis}
                  onChange={(basis) => update({ ...activeGame, basis })}
                  accessibilityLabel={`${mode.name} scoring basis`}
                />
              ) : null}
              {stakeField && stakeField.type === 'number' ? (
                <View style={{ flex: 1, minWidth: 140 }}>
                  <Stepper
                    value={stake}
                    min={stakeField.min ?? 0}
                    max={stakeField.max ?? 999}
                    step={stakeField.step ?? 1}
                    prefix={symbol ? stakeLabel : undefined}
                    suffix={symbol ? undefined : stakeLabel === 'points' ? 'pts' : stakeLabel}
                    onChange={(v) => update({ ...activeGame, config: { ...activeGame.config, stake: v } })}
                    accessibilityLabel={`${mode.name} stake`}
                  />
                </View>
              ) : null}
            </View>
            {hint ? (
              <Text step="label" tone="secondary" numberOfLines={2}>
                {hint}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Hide' : 'Show'} ${mode.name} rules`} onPress={() => setRulesOpen(open ? null : mode.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, marginBottom: -space[3], alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}>
          <Text step="label" tone="accent">
            Rules
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.accentText} />
        </Pressable>
        {open ? (
          <Text step="label" tone="secondary" style={{ marginTop: space[3] }}>
            {mode.rules}
          </Text>
        ) : null}
      </Card>
    );
  }
}
