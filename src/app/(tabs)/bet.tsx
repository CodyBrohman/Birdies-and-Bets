import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, Badge, Button, Card, Chip, IconTile, ListRow, Screen, ScreenHeader, SectionLabel, Segmented, Sheet, Text, type IoniconName, Pressable } from '@/components/ui';
import { AddFriendSheet } from '@/components/AddFriendSheet';
import { GameConfigSheet } from '@/components/games';
import { RoundSettingsSheet } from '@/components/round';
import { coursePar } from '@/components/courseArt';
import { useTheme } from '@/theme';
import { ensureMeInCrew, fitReason, inCrew, MIN_PLAYERS, newActiveGame, participantCountOf, sidesLabel, toggleCrew, useGameCatalog, useMe, useRoundStore } from '@/store';
import type { ActiveGame, GameMode, Nine, PlayerProfile } from '@/types';
import { holesInPlay } from '@/lib/handicap';
import { formatIndex, joinMeta, plural } from '@/lib/format';
import { TEE_SLOTS, dayLabel, formatSlot, parseTeeTime, teeDays, teeTimeValue } from '@/lib/teeTime';
import { trackRoundDiscarded, trackRoundStarted } from '@/services';

type GameFilter = 'all' | 'betting' | 'social';

const GAME_ICONS: Record<string, IoniconName> = {
  'bingo-bango-bongo': 'golf-outline',
  'hot-seat': 'flame-outline',
  'match-play': 'git-compare-outline',
  nassau: 'layers-outline',
  skins: 'diamond-outline',
  stableford: 'stats-chart-outline',
  'stroke-play': 'podium-outline',
  vegas: 'dice-outline',
  wolf: 'paw-outline',
};

/** Bet: the round builder. Your round card, tee time, your crew, side games, then Start. */
export default function BetScreen() {
  const router = useRouter();
  const { c, f, space, layout } = useTheme();
  const catalog = useGameCatalog();
  const draft = useRoundStore((s) => s.draft);
  const round = useRoundStore((s) => s.round);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  const setDraftSettings = useRoundStore((s) => s.setDraftSettings);
  const startRound = useRoundStore((s) => s.startRound);
  const discardRound = useRoundStore((s) => s.discardRound);
  const { me, friends } = useMe();

  const [games, setGames] = useState<ActiveGame[]>([]);
  const [filter, setFilter] = useState<GameFilter>('all');
  const [configFor, setConfigFor] = useState<string | null>(null);
  const [rulesFor, setRulesFor] = useState<GameMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teeOpen, setTeeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [full, setFull] = useState(false);

  // The owner joins every new round by default.
  useFocusEffect(
    useCallback(() => {
      ensureMeInCrew(me);
    }, [me]),
  );

  const course = draft.course;
  const tee = course?.teeBoxes.find((t) => t.id === draft.teeBoxId);
  const players = draft.players.filter((p) => p.name.trim());
  const settings = draft.settings;
  const holes = course ? holesInPlay(course, settings.holeCount, settings.nine) : [];
  const live = round && round.status === 'in-progress' ? round : null;

  const now = new Date();
  const days = teeDays(now);
  const picked = parseTeeTime(settings.teeTime);
  const day = picked?.day ?? days[0]!.key;
  const setTee = (d: string, slot: string | undefined) => setDraftSettings({ teeTime: slot ? teeTimeValue(d, slot) : undefined });

  const crew: PlayerProfile[] = useMemo(() => [...(me ? [me] : []), ...friends], [me, friends]);
  const toggle = (p: PlayerProfile) => {
    const ok = toggleCrew(p);
    setFull(!ok);
  };

  // Games
  const isOn = (id: string) => games.some((g) => g.gameId === id);
  const needsSheet = (mode: GameMode) => !!mode.participantCount || !!mode.participantCountFor || mode.configFields.length > 0;
  const toggleGame = (mode: GameMode) => {
    if (isOn(mode.id)) {
      setGames(games.filter((g) => g.gameId !== mode.id));
      return;
    }
    const fresh = newActiveGame(mode);
    const count = participantCountOf(mode, fresh);
    const playerIds = count ? players.slice(0, count).map((p) => p.id) : undefined;
    setGames([...games, { ...fresh, playerIds }]);
    if (mode.participantCount || mode.participantCountFor) setConfigFor(mode.id);
  };
  const updateGame = (next: ActiveGame) => setGames(games.map((g) => (g.gameId === next.gameId ? next : g)));
  const shown = catalog.filter((g) => filter === 'all' || g.category === filter);
  const incomplete = games.filter((g) => {
    const m = catalog.find((x) => x.id === g.gameId);
    if (!m) return false;
    const count = participantCountOf(m, g);
    if (count && (g.playerIds?.length ?? 0) !== count) return true;
    return sidesLabel(m, g, players) === 'Pick the teams';
  });
  // A game that no longer fits the group (someone left the crew) is dropped at start.
  const fitting = games.filter((g) => {
    const m = catalog.find((x) => x.id === g.gameId);
    return m && !fitReason(m, players.length);
  });

  const blocker = !course ? 'Pick a course to get started.' : players.length < MIN_PLAYERS ? 'Add yourself to the round.' : incomplete.length ? `Pick players for ${incomplete.map((g) => catalog.find((m) => m.id === g.gameId)?.name).join(', ')}.` : null;

  const start = () => {
    if (blocker) return;
    if (live) {
      setConfirmReplace(true);
      return;
    }
    const r = startRound(fitting);
    if (r) {
      trackRoundStarted(r);
      setGames([]);
      router.push('/round/play');
    }
  };

  const gameNames = fitting.map((g) => catalog.find((m) => m.id === g.gameId)?.name).filter(Boolean);
  const configMode = configFor ? (catalog.find((g) => g.id === configFor) ?? null) : null;
  const configActive = configFor ? (games.find((g) => g.gameId === configFor) ?? null) : null;

  return (
    <Screen noBottomInset>
      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingTop: space[6], paddingBottom: layout.section }} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Round builder" title="Make it your round." subtitle="Pick a track, bring your people, add a little game." style={{ marginBottom: space[2] }} />

        {live ? (
          <Card onPress={() => router.push('/round/play')} accessibilityLabel={`Round in play at ${live.course.name}. Continue`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconTile icon="golf-outline" />
            <View style={{ flex: 1 }}>
              <Text step="title" numberOfLines={1}>
                Round in play at {live.course.name}
              </Text>
              <Text step="caption" tone="tertiary" tabular={false}>
                Hole {live.currentHole} · tap to keep scoring
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={c.textPrimary} />
          </Card>
        ) : null}

        {/* Your round */}
        <Card variant="hero" padding="roomy" style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: c.accentTint }} />
            <Text step="eyebrow" style={{ color: c.onHeroSoft, flex: 1 }}>
              Your round
            </Text>
            <Ionicons name="golf-outline" size={22} color={c.goldFill} />
          </View>
          <View style={{ gap: 4 }}>
            <Text step="headline" style={{ color: c.onHero, fontSize: 23, lineHeight: 28 }} numberOfLines={2}>
              {course?.name ?? 'No course yet'}
            </Text>
            <Text step="caption" tabular={false} style={{ color: c.onHeroSoft, fontFamily: f.uiSemibold }}>
              {course ? joinMeta([course.location, plural(holes.length, 'hole'), `Par ${holes.reduce((s, h) => s + h.par, 0) || coursePar(course)}`]) : 'Pick a track from Courses.'}
            </Text>
          </View>
          {course ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4], flexWrap: 'wrap' }}>
              <HeroFact icon="calendar-outline" text={dayLabel(day, now)} />
              <HeroFact icon="time-outline" text={picked ? formatSlot(picked.slot) : 'Any time'} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Tees: ${tee?.name ?? 'pick'}. Change`} onPress={() => setTeeOpen(true)} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <HeroFact icon="flag-outline" text={tee ? `${tee.name} tees` : 'Pick tees'} chevron />
              </Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[1] }}>
            {course ? <Button label="Start this round" variant="hero" size="md" icon="arrow-forward" disabled={!!blocker} onPress={start} /> : <Button label="Pick a course" variant="hero" size="md" icon="arrow-forward" onPress={() => router.navigate('/courses')} />}
            {course ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Change course" onPress={() => router.navigate('/courses')} hitSlop={10} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                <Ionicons name="sync-outline" size={22} color={c.onHero} />
              </Pressable>
            ) : null}
          </View>
          {course && blocker ? (
            <Text step="caption" tabular={false} style={{ color: c.onHeroSoft }}>
              {blocker}
            </Text>
          ) : null}
        </Card>

        {/* Tee time */}
        <SectionLabel style={{ marginTop: layout.section - layout.stack }}>Tee time</SectionLabel>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {days.map((d) => (
            <Chip key={d.key} label={d.label} selected={d.key === day} onPress={() => setTee(d.key, picked?.slot ?? TEE_SLOTS[1])} />
          ))}
        </View>
        <Card style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={18} color={c.textPrimary} />
            <Text step="title" style={{ fontSize: 14 }}>
              Tee time
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {TEE_SLOTS.map((slot) => (
              <Chip key={slot} shape="time" label={formatSlot(slot)} selected={picked?.slot === slot && picked.day === day} onPress={() => setTee(day, picked?.slot === slot && picked.day === day ? undefined : slot)} />
            ))}
          </View>
        </Card>

        {/* Crew */}
        <SectionLabel action={{ label: 'Invite friends', onPress: () => setAddOpen(true) }} sub={`${plural(players.length, 'player')} of 4 · tap to add or remove`} style={{ marginTop: layout.section - layout.stack }}>
          Bring your crew
        </SectionLabel>
        {crew.length === 0 ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }} onPress={() => setAddOpen(true)} accessibilityLabel="Add your first friend">
            <IconTile icon="person-add-outline" />
            <View style={{ flex: 1 }}>
              <Text step="title">Add the people you play with</Text>
              <Text step="caption" tone="tertiary" tabular={false}>
                Name and handicap index. Saved on this phone.
              </Text>
            </View>
          </Card>
        ) : null}
        {crew.map((p, i) => {
          const on = inCrew(players, p.id);
          return (
            <Card key={p.id} padding="none" style={{ paddingHorizontal: space[4] }}>
              <ListRow
                leading={<Avatar name={p.name} index={i} size={40} />}
                title={p.name}
                titleAccessory={p.id === me?.id ? <Badge label="You" tone="accent" /> : undefined}
                meta={p.handicapIndex != null ? `HCP ${formatIndex(p.handicapIndex)}` : 'Scratch'}
                onPress={() => toggle(p)}
                accessibilityLabel={`${on ? 'Remove' : 'Add'} ${p.name}`}
                trailing={<Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={26} color={on ? c.accent : c.textSecondary} />}
              />
            </Card>
          );
        })}
        {full ? (
          <Text step="caption" tone="negative" tabular={false}>
            Four is a full group. Take someone out first.
          </Text>
        ) : null}

        {/* Side games */}
        <SectionLabel sub="Pick a friendly wager or keep it just for fun. Side games are optional." style={{ marginTop: layout.section - layout.stack }}>
          Add a side game
        </SectionLabel>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Chip label="All games" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Wagers" selected={filter === 'betting'} onPress={() => setFilter('betting')} />
          <Chip label="For fun" selected={filter === 'social'} onPress={() => setFilter('social')} />
        </View>
        {shown.map((mode) => {
          const reason = fitReason(mode, Math.max(players.length, MIN_PLAYERS));
          const on = isOn(mode.id);
          const active = games.find((g) => g.gameId === mode.id);
          const sides = active ? sidesLabel(mode, active, players) : null;
          const range = mode.minPlayers === mode.maxPlayers ? `${mode.minPlayers} players` : `${mode.minPlayers}–${mode.maxPlayers} players`;
          return (
            <Card key={mode.id} selected={on} padding="none" style={{ paddingHorizontal: space[4], opacity: reason ? 0.45 : 1 }}>
              <ListRow
                leading={<IconTile icon={GAME_ICONS[mode.id] ?? 'trophy-outline'} />}
                title={mode.name}
                titleAccessory={<Badge label={mode.category === 'social' ? 'For fun' : 'Wager'} tone={mode.category === 'social' ? 'accent' : 'gold'} />}
                meta={reason ?? mode.blurb}
                onPress={reason ? undefined : () => toggleGame(mode)}
                accessibilityLabel={`${on ? 'Remove' : 'Add'} ${mode.name}`}
                trailing={<Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={26} color={on ? c.accent : c.textSecondary} />}
                footer={on ? (
                  <View style={{ flexDirection: 'row', gap: space[4], marginTop: 6 }}>
                    {needsSheet(mode) ? <InlineLink label={sides ? `${sides} · Edit` : 'Set it up'} onPress={() => setConfigFor(mode.id)} /> : null}
                    <InlineLink label="Rules" onPress={() => setRulesFor(mode)} />
                  </View>
                ) : null}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text step="caption" tabular={false} style={{ flex: 1, fontFamily: f.uiBold, fontSize: 12, color: mode.category === 'social' ? c.accentText : c.textPrimary }}>
                    {mode.category === 'social' ? 'Bragging rights only' : `Stakes in ${settings.stakeLabel}`}
                  </Text>
                  <Text step="caption" tone="tertiary" tabular={false} style={{ fontSize: 12 }}>
                    {range}
                  </Text>
                </View>
              </ListRow>
            </Card>
          );
        })}

        {/* Add-ons */}
        <Card style={{ gap: space[3], marginTop: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3] }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text step="eyebrow" tone="tertiary" style={{ fontSize: 10 }}>
                Round add-ons
              </Text>
              <Text step="title">Keep it simple, or add a game.</Text>
            </View>
            <IconTile icon="sparkles-outline" size={40} />
          </View>
          <Text step="label" tone="accent">
            {gameNames.length ? `${plural(gameNames.length, 'game')} added: ${gameNames.join(', ')}.` : 'Just a scorecard. Nice and simple.'}
          </Text>
          <Segmented<'18' | 'front' | 'back'>
            compact
            accessibilityLabel="Holes"
            options={[
              { value: '18', label: '18 holes' },
              { value: 'front', label: 'Front 9' },
              { value: 'back', label: 'Back 9' },
            ]}
            value={settings.holeCount === 18 ? '18' : (settings.nine ?? 'front')}
            onChange={(v) => setDraftSettings(v === '18' ? { holeCount: 18, nine: 'front', startHole: undefined } : { holeCount: 9, nine: v as Nine, startHole: undefined })}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Round settings" onPress={() => setSettingsOpen(true)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="options-outline" size={18} color={c.textSecondary} />
            <Text step="caption" tone="secondary" tabular={false} style={{ flex: 1 }}>
              {joinMeta([`${settings.allowance}% allowance`, settings.stakeLabel === 'points' ? 'points' : `stakes in ${settings.stakeLabel}`, settings.startHole ? `shotgun from ${settings.startHole}` : null])}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
          </Pressable>
          <Text step="caption" tone="tertiary" tabular={false}>
            Suggested stakes are for your group to agree on. No payments are collected in this app.
          </Text>
        </Card>

        {course ? <Button label={live ? 'Start a new round' : 'Start this round'} icon="arrow-forward" disabled={!!blocker} onPress={start} style={{ marginTop: space[2] }} /> : null}
      </ScrollView>

      <AddFriendSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(p) => {
          setFull(!toggleCrew(p));
        }}
      />
      <GameConfigSheet mode={configMode} active={configActive} players={players} stakeLabel={settings.stakeLabel} onChange={updateGame} onClose={() => setConfigFor(null)} />
      <RoundSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} holes={holes} allowStartHole onChange={(patch) => setDraftSettings(patch)} />

      <Sheet visible={!!rulesFor} onClose={() => setRulesFor(null)} title={rulesFor?.name} subtitle={rulesFor?.blurb}>
        <Text step="body" tone="secondary">
          {rulesFor?.rules}
        </Text>
      </Sheet>

      <Sheet visible={teeOpen} onClose={() => setTeeOpen(false)} title="Tees" subtitle={course?.name}>
        <View style={{ gap: space[2] }}>
          {course?.teeBoxes.map((t) => (
            <Card key={t.id} selected={t.id === draft.teeBoxId} onPress={() => (setDraftCourse(course, t.id), setTeeOpen(false))} accessibilityLabel={`${t.name} tees`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: t.color ?? c.textTertiary, borderWidth: 1, borderColor: c.dividerSoft }} />
              <View style={{ flex: 1 }}>
                <Text step="title">{t.name}</Text>
                <Text step="caption" tone="tertiary">
                  {joinMeta([t.totalYards ? `${t.totalYards.toLocaleString()} yds` : null, t.rating ? `${t.rating.toFixed(1)} / ${t.slope ?? '—'}` : null])}
                </Text>
              </View>
              {t.id === draft.teeBoxId ? <Ionicons name="checkmark-circle" size={24} color={c.accent} /> : null}
            </Card>
          ))}
        </View>
      </Sheet>

      <Sheet visible={confirmReplace} onClose={() => setConfirmReplace(false)} title="Start a new round?" subtitle="The round in play will be discarded.">
        <View style={{ gap: space[2] }}>
          <Button
            label="Discard and start"
            onPress={() => {
              if (live) trackRoundDiscarded(live);
              discardRound();
              setConfirmReplace(false);
              const r = startRound(fitting);
              if (r) {
                trackRoundStarted(r);
                setGames([]);
                router.push('/round/play');
              }
            }}
          />
          <Button label="Keep playing" variant="secondary" onPress={() => setConfirmReplace(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

function HeroFact({ icon, text, chevron }: { icon: IoniconName; text: string; chevron?: boolean }) {
  const { c, f } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={16} color={c.onHero} />
      <Text step="caption" tabular={false} style={{ color: c.onHero, fontFamily: f.uiBold }}>
        {text}
      </Text>
      {chevron ? <Ionicons name="chevron-down" size={14} color={c.onHeroSoft} /> : null}
    </View>
  );
}

function InlineLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { f } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Text step="caption" tone="accent" tabular={false} style={{ fontFamily: f.uiBold }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
