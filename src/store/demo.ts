/**
 * Demo data for the App Store screenshots (scripts/screenshots.md). Only a build made with EXPO_PUBLIC_DEMO_DATA=1
 * writes it, on a launch with nothing saved yet; the root layout loads this file only in that build.
 *
 * Five people, two courses, three finished rounds and a round in progress on hole 17 of 18. The rounds are scored and
 * summarised by the same game modules and history code as real ones, so every number on screen is the app's own.
 * The course names are made up; the holes are the bundled sample course's.
 */
import type { ActiveGame, Course, HistoryEntry, HoleResult, Player, PlayerGroup, PlayerProfile, Round, RoundSettings } from '@/types';
import { SAMPLE_COURSE } from '@/data/courses';
import { defaultConfig, getGame, runGame } from '@/games';
import { computeAllHandicaps, holesInPlay } from '@/lib/handicap';
import { summarizeRound } from '@/lib/history';
import { playerFromProfile } from '@/lib/profiles';
import { netSettlements } from '@/lib/settlement';
import { teeTimeFromDate } from '@/lib/teeTime';
import { SCHEMA_VERSION, STORAGE_KEYS, type StorageAdapter } from './storage/adapter';
import type { Draft } from './roundStore';
import type { Preferences } from './preferencesStore';

const DAY = 24 * 60 * 60 * 1000;

/** Strokes over par per hole, one column per seat: Alex (14.2), Maya (11.2), Jordan (18.4), Sam (7.8). */
const OVER_PAR: readonly (readonly number[])[] = [
  [1, 0, 2, 0],
  [0, 1, 1, -1],
  [2, 0, 1, 0],
  [0, -1, 2, 1],
  [1, 1, 0, 0],
  [-1, 0, 1, 0],
  [1, 2, 1, 0],
  [0, 0, 2, 1],
  [1, 1, 1, 0],
  [1, 0, 0, 1],
  [0, 1, 3, 0],
  [1, 0, 1, 1],
  [0, 1, 1, 0],
  [2, 0, 2, -1],
  [1, -1, 1, 1],
  [0, 1, 0, 0],
  [1, 0, 2, 0],
  [0, 1, 1, 1],
];

/**
 * The pattern started `shift` holes later, with these columns, plus a stroke here and there (per hole number, per
 * seat) so no two demo rounds share a total.
 */
function overPar(shift: number, columns: number[], extra: Record<number, number[]> = {}): number[][] {
  return OVER_PAR.map((_, i) => columns.map((c, seat) => OVER_PAR[(i + shift) % OVER_PAR.length]![c]! + (extra[i + 1]?.[seat] ?? 0)));
}

function demoCourse(id: string, name: string, location: string): Course {
  return { ...SAMPLE_COURSE, id, name, location, userEntered: true, source: 'user' };
}

function game(gameId: string, config: ActiveGame['config'] = {}, playerIds?: string[]): ActiveGame {
  const mode = getGame(gameId);
  if (!mode) throw new Error(`Unknown game ${gameId}`);
  return { gameId, config: { ...defaultConfig(mode.configFields), ...config }, basis: mode.defaultBasis, ...(playerIds ? { playerIds } : {}) };
}

/** Scores for the first `count` holes. The wolf rotates in seat order and takes the player two seats on, or goes alone. */
function scoreHoles(course: Course, players: Player[], pattern: number[][], count: number, wolf?: { alone: number[] }, notes: Record<number, string> = {}): HoleResult[] {
  return course.holes.slice(0, count).map((hole, i) => {
    const result: HoleResult = { holeNumber: hole.number, scores: Object.fromEntries(players.map((p, seat) => [p.id, hole.par + pattern[i]![seat]!])) };
    if (wolf) {
      const w = i % players.length;
      const partner = players[(w + 2) % players.length]!;
      result.gameInputs = { wolf: wolf.alone.includes(hole.number) ? { mode: 'Alone' } : { mode: 'With a partner', partner: partner.id } };
    }
    if (notes[hole.number]) result.note = notes[hole.number];
    return result;
  });
}

/** What Results would save for this round. */
function summarize(round: Round, completedAt: string): HistoryEntry {
  const { holeCount, allowance, nine } = round.settings;
  const holes = holesInPlay(round.course, holeCount, nine);
  const handicaps = computeAllHandicaps(round.players, round.course, { holeCount, allowance, nine });
  const runs = round.games.flatMap((g) => {
    const mode = getGame(g.gameId);
    return mode ? [runGame(round, g, mode, handicaps)] : [];
  });
  const netted = netSettlements(
    runs.map((r) => r.settlement),
    round.players.map((p) => p.id),
  );
  const summary = summarizeRound({ round, holes, handicaps, standings: runs.map((r) => r.standings), gameNames: runs.map((r) => r.mode.name), netted, completedAt });
  return { summary, round };
}

/** A local time `days` ago (negative: from now) at `hour`:`minute`. */
function daysAgo(now: Date, days: number, hour: number, minute = 0): Date {
  const d = new Date(now.getTime() - days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Every stored value the demo writes, keyed by storage key. */
export function demoData(now: Date = new Date()): Record<string, unknown> {
  const iso = (d: Date) => d.toISOString();
  const settings: RoundSettings = { holeCount: 18, allowance: 100, stakeLabel: 'points' };

  const harbour = demoCourse('demo-harbour-pines', 'Harbour Pines Golf Club', 'Oakville, ON');
  const maple = demoCourse('demo-maple-hollow', 'Maple Hollow Golf Club', 'Caledon, ON');
  const blue = harbour.teeBoxes[0]!.id;
  const white = harbour.teeBoxes[1]?.id ?? blue;

  const profile = (id: string, name: string, index: number, earlier?: number): PlayerProfile => ({
    id,
    name,
    handicapIndex: index,
    indexHistory: [...(earlier != null ? [{ at: iso(daysAgo(now, 70, 18)), index: earlier }] : []), { at: iso(daysAgo(now, 30, 18)), index }],
    createdAt: iso(daysAgo(now, 90, 18)),
  });
  const alex = profile('pr_demo_alex', 'Alex Morgan', 14.2, 15.1);
  const maya = profile('pr_demo_maya', 'Maya Chen', 11.2, 12.0);
  const jordan = profile('pr_demo_jordan', 'Jordan Lee', 18.4);
  const sam = profile('pr_demo_sam', 'Sam Rivera', 7.8);
  const priya = profile('pr_demo_priya', 'Priya Shah', 22.0);
  const seats = (roundId: string, people: PlayerProfile[], teeBoxId: string) => people.map((p, i) => playerFromProfile(p, `${roundId}_p${i + 1}`, teeBoxId));

  const finished = (id: string, course: Course, people: PlayerProfile[], games: (players: Player[]) => ActiveGame[], pattern: number[][], ended: Date, notes?: Record<number, string>): HistoryEntry => {
    const players = seats(id, people, blue);
    const round: Round = {
      id,
      createdAt: iso(new Date(ended.getTime() - 4.5 * 60 * 60 * 1000)),
      updatedAt: iso(ended),
      status: 'complete',
      course,
      teeBoxId: blue,
      players,
      games: games(players),
      settings,
      holeResults: scoreHoles(course, players, pattern, 18, undefined, notes),
      currentHole: 18,
    };
    return summarize(round, iso(ended));
  };

  const history: HistoryEntry[] = [
    finished(
      'r_demo_1',
      harbour,
      [alex, maya, jordan, sam],
      (p) => [game('skins', { stake: 1 }), game('nassau', { format: 'teams', teams: [p[0]!.id, p[1]!.id] })],
      overPar(5, [0, 1, 2, 3], { 2: [0, 0, 0, 1], 5: [1, 0, 0, 0], 6: [0, 0, -1, 0], 8: [0, 0, -1, 0], 11: [1, 0, 0, 0], 13: [0, 1, 0, 0] }),
      daysAgo(now, 4, 12, 40),
      { 11: 'Pin tucked back right, played a club long' },
    ),
    finished(
      'r_demo_2',
      maple,
      [alex, maya, priya],
      () => [game('skins', { stake: 2 }), game('stableford')],
      overPar(9, [0, 1, 2], { 1: [0, 1, 1], 3: [0, 1, 0], 5: [-1, 0, 0], 7: [0, 0, 1], 12: [-1, 0, 0], 14: [0, 0, 1], 17: [0, 1, 0] }),
      daysAgo(now, 11, 13, 5),
    ),
    finished(
      'r_demo_3',
      harbour,
      [alex, jordan],
      (p) => [game('match-play', {}, [p[0]!.id, p[1]!.id])],
      overPar(13, [0, 2], { 3: [1, 0], 16: [0, -1] }),
      daysAgo(now, 25, 11, 50),
    ),
  ];

  // The round in progress: hole 17 just scored, hole 18 still to play.
  const livePlayers = seats('r_demo_live', [alex, maya, jordan, sam], blue);
  const live: Round = {
    id: 'r_demo_live',
    createdAt: iso(new Date(now.getTime() - 4 * 60 * 60 * 1000)),
    updatedAt: iso(now),
    status: 'in-progress',
    course: harbour,
    teeBoxId: blue,
    players: livePlayers,
    games: [game('skins', { stake: 2 }), game('nassau', {}, [livePlayers[0]!.id, livePlayers[3]!.id]), game('wolf')],
    settings,
    holeResults: scoreHoles(harbour, livePlayers, overPar(0, [0, 1, 2, 3]), 17, { alone: [2, 10, 14] }, { 6: 'Alex holed a 20-footer for birdie', 14: 'Jordan lost a ball in the creek' }),
    currentHole: 17,
  };

  // The next round being set up, for the New round screenshot once the live one is saved.
  const draftPlayers = seats('draft', [alex, maya, jordan, sam], white);
  const draft: Draft = {
    course: maple,
    teeBoxId: white,
    players: draftPlayers,
    settings: { ...settings, teeTime: teeTimeFromDate(daysAgo(now, -1, 8, 10)) },
    games: [game('skins'), game('nassau', { format: 'teams', teams: [draftPlayers[0]!.id, draftPlayers[2]!.id] })],
  };

  const lastPlayed = (p: PlayerProfile): PlayerProfile => {
    const dates = history.filter((e) => e.round?.players.some((x) => x.profileId === p.id)).map((e) => e.summary.completedAt);
    return dates.length ? { ...p, lastPlayedAt: dates.sort().at(-1) } : p;
  };
  const group: PlayerGroup = { id: 'grp_demo_saturday', name: 'Saturday group', memberIds: [alex.id, maya.id, jordan.id, sam.id] };
  const preferences: Preferences = {
    haptics: true,
    defaultStakeLabel: 'points',
    defaultAllowance: 100,
    onboarded: true,
    meProfileId: alex.id,
    homeCourseId: harbour.id,
    crashReports: false,
    analytics: false,
    // Saving the round in the screenshot flow is the fourth finished round: no rating prompt over the next screen.
    reviewPrompted: true,
  };

  return {
    [STORAGE_KEYS.schemaVersion]: SCHEMA_VERSION,
    [STORAGE_KEYS.preferences]: preferences,
    [STORAGE_KEYS.playerProfiles]: [alex, maya, jordan, sam, priya].map(lastPlayed),
    [STORAGE_KEYS.playerGroups]: [group],
    [STORAGE_KEYS.userCourses]: [harbour, maple],
    [STORAGE_KEYS.recentCourses]: [harbour.id, maple.id],
    [STORAGE_KEYS.roundHistory]: history,
    [STORAGE_KEYS.activeRound]: live,
    [STORAGE_KEYS.draft]: draft,
  };
}

/** Write the demo data when nothing is saved yet. Returns whether it wrote anything. */
export async function seedDemoData(storage: StorageAdapter, now: Date = new Date()): Promise<boolean> {
  const keys = [STORAGE_KEYS.preferences, STORAGE_KEYS.activeRound, STORAGE_KEYS.roundHistory, STORAGE_KEYS.playerProfiles, STORAGE_KEYS.userCourses];
  for (const key of keys) if ((await storage.get<unknown>(key)) != null) return false;
  for (const [key, value] of Object.entries(demoData(now))) await storage.set(key, value);
  return true;
}
