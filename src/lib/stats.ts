// Dashboard numbers. Pure: takes finished-round insights (built in the store, which can run games) and folds them.
import type { Hole, PlayerId, Round, RoundSummary, RoundSummaryPlayer } from '@/types';
import { relationToPar, scoreOn, type Relation } from './scoring';
import { sameName } from './profiles';

export type RelationCounts = Record<Relation, number> & { pickups: number };

const EMPTY_COUNTS = (): RelationCounts => ({ albatross: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, 'triple-plus': 0, pickups: 0 });

/** How many birdies, pars, bogeys… a player made on the holes given (gross). */
export function relationCounts(round: Pick<Round, 'holeResults'>, holes: Hole[], playerId: PlayerId): RelationCounts {
  const out = EMPTY_COUNTS();
  for (const h of holes) {
    const v = scoreOn(round.holeResults, playerId, h.number, 'gross');
    if (v === null) out.pickups++;
    else if (typeof v === 'number') out[relationToPar(v - h.par)]++;
  }
  return out;
}

/** The two most telling counts as chips: "3 birdies", "10 pars". */
export function countChips(counts: RelationCounts): string[] {
  const order: { key: Relation; word: string }[] = [
    { key: 'albatross', word: 'albatross' },
    { key: 'eagle', word: 'eagle' },
    { key: 'birdie', word: 'birdie' },
    { key: 'par', word: 'par' },
    { key: 'bogey', word: 'bogey' },
  ];
  return order
    .filter((o) => counts[o.key] > 0)
    .slice(0, 2)
    .map((o) => `${counts[o.key]} ${o.word}${counts[o.key] === 1 ? '' : o.key === 'albatross' ? 'es' : 's'}`);
}

/** One finished round, with everything the dashboard needs precomputed. */
export interface RoundInsight {
  summary: RoundSummary;
  stakeLabel: string;
  /** Round player id → saved profile id, when the round recorded one. */
  profileIds: Record<PlayerId, string | undefined>;
  /** Net points per round player (positive collects). Empty when the full round was not saved. */
  netByPlayer: Record<PlayerId, number>;
  counts: Record<PlayerId, RelationCounts>;
}

export interface Me {
  id: string;
  name: string;
}

/** The round player that is "me": linked by profile id first, else by name. */
export function findMe(insight: RoundInsight, me: Me): RoundSummaryPlayer | undefined {
  const byId = Object.entries(insight.profileIds).find(([, pid]) => pid === me.id)?.[0];
  return insight.summary.players.find((p) => (byId ? p.id === byId : sameName(p.name, me.name)));
}

export type Stats =
  | { kind: 'personal'; name: string; rounds: number; avgGross: number | null; bestGross: number | null; netPoints: number; wins: number }
  | { kind: 'phone'; rounds: number; courses: number; games: number; players: number };

/** Personal stats when "me" is set and appears in at least one round; otherwise what this phone has seen. */
export function aggregateStats(insights: RoundInsight[], me?: Me): Stats {
  if (me) {
    const mine = insights.map((i) => ({ i, p: findMe(i, me) })).filter((x): x is { i: RoundInsight; p: RoundSummaryPlayer } => x.p != null);
    if (mine.length > 0) {
      const grosses = mine.map((x) => x.p.gross);
      return {
        kind: 'personal',
        name: me.name,
        rounds: mine.length,
        avgGross: Math.round((grosses.reduce((a, b) => a + b, 0) / grosses.length) * 10) / 10,
        bestGross: Math.min(...grosses),
        netPoints: mine.reduce((sum, x) => sum + (x.i.netByPlayer[x.p.id] ?? 0), 0),
        wins: mine.filter((x) => x.i.summary.leaderId === x.p.id).length,
      };
    }
  }
  const courses = new Set(insights.map((i) => i.summary.courseName.trim().toLowerCase()));
  const players = new Set(insights.flatMap((i) => i.summary.players.map((p) => p.name.trim().toLowerCase())));
  return { kind: 'phone', rounds: insights.length, courses: courses.size, games: insights.reduce((n, i) => n + i.summary.gameNames.length, 0), players: players.size };
}

/** "+40" / "−20" / "Even" for a net points figure. */
export function formatNet(net: number): string {
  if (net === 0) return 'Even';
  return net > 0 ? `+${net}` : `−${Math.abs(net)}`;
}

export interface StripCell {
  holeNumber: number;
  par: number;
  /** Best gross score in the group on that hole; null when everyone picked up; undefined when unplayed. */
  best: number | null | undefined;
  relation?: Relation;
  current: boolean;
}

/** The live card's recent-holes strip: the last `n` played holes in play order, then the current hole. */
export function recentHoles(round: Pick<Round, 'holeResults' | 'players'>, order: Hole[], currentHole: number, n: number = 5): StripCell[] {
  const played = order.filter((h) => round.holeResults.some((r) => r.holeNumber === h.number && Object.keys(r.scores).length > 0) && h.number !== currentHole);
  const cells: StripCell[] = played.slice(-n).map((h) => {
    const scores = round.players.map((p) => scoreOn(round.holeResults, p.id, h.number, 'gross')).filter((v): v is number | null => v !== undefined);
    const numeric = scores.filter((v): v is number => typeof v === 'number');
    const best = numeric.length ? Math.min(...numeric) : scores.length ? null : undefined;
    return { holeNumber: h.number, par: h.par, best, relation: typeof best === 'number' ? relationToPar(best - h.par) : undefined, current: false };
  });
  const cur = order.find((h) => h.number === currentHole);
  if (cur) cells.push({ holeNumber: cur.number, par: cur.par, best: undefined, current: true });
  return cells;
}
