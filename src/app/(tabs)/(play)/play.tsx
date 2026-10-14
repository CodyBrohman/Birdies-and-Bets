import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { actionSheet, Avatar, Button, confirm, DateTimeField, ListItem, ListSection, ScrollScreen, SegmentedControl, Text } from '@/components/ui';
import { LiveRoundBanner } from '@/components/round';
import { useTheme } from '@/theme';
import { ensureMeInCrew, gameMeta, gameSummary, MAX_PLAYERS, MIN_PLAYERS, fitReason, setupNeeded, useMe, useRoundStore } from '@/store';
import type { Nine } from '@/types';
import { computeAllHandicaps, teeHasRating } from '@/lib/handicap';
import { courseSummary, teeSummary } from '@/lib/courseInfo';
import { formatIndex, joinMeta } from '@/lib/format';
import { formatTeeTime, suggestedTeeTime, teeTimeFromDate, teeTimeToDate } from '@/lib/teeTime';
import { trackRoundDiscarded, trackRoundStarted } from '@/services';

/**
 * New round (the Play tab): one grouped form — course, tees and holes; an optional tee time; the players; the games;
 * round options — and one Start round pinned at the bottom, with the reason above it when something is missing.
 */
export default function NewRoundScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const draft = useRoundStore((s) => s.draft);
  const round = useRoundStore((s) => s.round);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  const setDraftSettings = useRoundStore((s) => s.setDraftSettings);
  const setDraftPlayers = useRoundStore((s) => s.setDraftPlayers);
  const startRound = useRoundStore((s) => s.startRound);
  const discardRound = useRoundStore((s) => s.discardRound);
  const { me } = useMe();

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
  const live = round && round.status === 'in-progress' ? round : null;
  const handicaps = course ? computeAllHandicaps(players, course, settings) : {};
  const now = new Date();
  const teeTime = teeTimeToDate(settings.teeTime);

  // Games that still fit the group; one that doesn't (someone left) is dropped at the start.
  const games = draft.games.filter((g) => {
    const m = gameMeta(g.gameId);
    return m && !fitReason(m, players.length);
  });
  const unready = games.flatMap((g) => {
    const m = gameMeta(g.gameId);
    const needs = m ? setupNeeded(m, g, players) : null;
    return m && needs ? [`${m.name}: ${needs.toLowerCase()}`] : [];
  });
  const blocker = !course ? 'Choose a course to start.' : players.length < MIN_PLAYERS ? 'Add at least one player.' : unready.length ? `${unready.join('; ')}.` : null;

  const start = async () => {
    if (blocker) return;
    if (live) {
      const ok = await confirm({ title: 'End the round in progress?', message: `Your round at ${live.course.name} is still going. Starting a new one discards it.`, confirmLabel: 'Discard and start', destructive: true });
      if (!ok) return;
      trackRoundDiscarded(live);
      discardRound();
    }
    const r = startRound(games);
    if (r) {
      trackRoundStarted(r);
      router.push('/round/play');
    }
  };

  const chooseTees = async () => {
    if (!course) return;
    const i = await actionSheet('Tees', course.teeBoxes.map((t) => ({ label: joinMeta([t.name, teeSummary(t)]) })));
    const picked = i != null ? course.teeBoxes[i] : undefined;
    if (picked) setDraftCourse(course, picked.id);
  };
  const playerMenu = async (id: string, name: string) => {
    const i = await actionSheet(name, [{ label: 'Remove from round', destructive: true }]);
    if (i === 0) setDraftPlayers(players.filter((p) => p.id !== id));
  };

  return (
    <ScrollScreen
      title="New round"
      largeTitle
      gap={space[6]}
      footer={
        <>
          {blocker || live ? (
            <Text step="footnote" tone="secondary" align="center" accessibilityLiveRegion="polite">
              {blocker ?? `A round is in progress at ${live!.course.name}. Starting this one ends it.`}
            </Text>
          ) : null}
          <Button label="Start round" disabled={!!blocker} onPress={() => void start()} testID="start-round" />
        </>
      }
    >
      <LiveRoundBanner />

      <ListSection
        header="Course"
        footer={course && tee && !teeHasRating(tee) && players.some((p) => p.handicapIndex != null) ? `${tee.name} tees have no rating or slope, so everyone plays off scratch. Add them by editing the course.` : undefined}
      >
        <ListItem title={course ? course.name : 'Course'} subtitle={course ? courseSummary(course) : undefined} value={course ? undefined : 'Choose'} strong={!!course} onPress={() => router.push('/new-round/course')} testID="choose-course" accessibilityLabel={course ? `Course, ${course.name}` : 'Choose a course'} />
        {course ? <ListItem title="Tees" value={tee?.name ?? 'Choose'} onPress={() => void chooseTees()} accessibilityLabel={`Tees, ${tee?.name ?? 'none chosen'}`} /> : null}
        {course && course.holes.length > 9 ? (
          <ListItem
            title="Holes"
            trailing={
              <SegmentedControl<'18' | 'front' | 'back'>
                accessibilityLabel="Holes"
                options={[
                  { value: '18', label: '18' },
                  { value: 'front', label: 'Front 9' },
                  { value: 'back', label: 'Back 9' },
                ]}
                value={settings.holeCount === 18 ? '18' : (settings.nine ?? 'front')}
                onChange={(v) => setDraftSettings(v === '18' ? { holeCount: 18, nine: 'front', startHole: undefined } : { holeCount: 9, nine: v as Nine, startHole: undefined })}
                style={{ width: 210 }}
              />
            }
          />
        ) : null}
      </ListSection>

      <ListSection header="Tee time" footer="Optional. It shows on Home until the round starts.">
        <ListItem title="Set a tee time" accessory={{ switch: !!teeTime, onChange: (on) => setDraftSettings({ teeTime: on ? suggestedTeeTime(now) : undefined }) }} />
        {teeTime ? (
          <ListItem
            title="Tee time"
            trailing={<DateTimeField value={teeTime} minimumDate={new Date(now.getFullYear(), now.getMonth(), now.getDate())} accessibilityLabel="Tee time" webText={formatTeeTime(settings.teeTime, now) ?? ''} onChange={(d) => setDraftSettings({ teeTime: teeTimeFromDate(d) })} />}
          />
        ) : null}
      </ListSection>

      <ListSection header={`Players · ${players.length} of ${MAX_PLAYERS}`}>
        {players.map((p, i) => {
          const h = handicaps[p.id];
          const you = !!me && p.profileId === me.id;
          return (
            <ListItem
              key={p.id}
              title={you ? `${p.name} (you)` : p.name}
              subtitle={p.handicapIndex != null ? joinMeta([`HCP ${formatIndex(p.handicapIndex)}`, h ? `CH ${h.courseHandicap < 0 ? `+${-h.courseHandicap}` : h.courseHandicap}` : null]) : 'No handicap'}
              leading={<Avatar name={p.name} seat={i} size={36} />}
              accessory="none"
              onPress={() => void playerMenu(p.id, p.name)}
              menu={[{ label: 'Remove from round', destructive: true, onPress: () => setDraftPlayers(players.filter((x) => x.id !== p.id)) }]}
              accessibilityHint="Options for this player"
            />
          );
        })}
        <ListItem title={players.length ? 'Add or change players' : 'Add players'} action onPress={() => router.push('/new-round/players')} testID="add-player" />
      </ListSection>

      <ListSection header="Games" footer="Points are a tally between players. Nothing is paid in the app.">
        {games.map((g) => {
          const m = gameMeta(g.gameId)!;
          return <ListItem key={g.gameId} title={m.name} strong subtitle={gameSummary(m, g, players, settings.stakeLabel)} onPress={() => router.push({ pathname: '/new-round/game/[gameId]', params: { gameId: g.gameId } })} />;
        })}
        <ListItem title={games.length ? 'Add another game' : 'Add a game'} action onPress={() => router.push('/new-round/add-game')} testID="add-game" />
      </ListSection>

      <ListSection>
        <ListItem title="Round options" value={joinMeta([`${settings.allowance}%`, settings.stakeLabel === 'points' ? 'Points' : settings.stakeLabel, settings.startHole ? `Start on ${settings.startHole}` : null])} onPress={() => router.push('/new-round/options')} />
      </ListSection>

    </ScrollScreen>
  );
}
