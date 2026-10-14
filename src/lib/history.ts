// Round history: boil a finished round down to what Home shows. Pure; imports only types/ and lib/.

import type { Hole } from '../types/course';
import type { PlayerId, PlayerRoundState } from '../types/player';
import type { Round, RoundSummary, RoundSummaryPlayer } from '../types/round';
import type { Standings } from '../types/game';
import { totals } from './scoring';
import { formatSigned, formatStake, formatToPar } from './format';
import type { NettedPair, NettedSettlement } from './settlement';

export interface SummarizeInput {
  round: Round;
  holes: Hole[];
  handicaps: Record<PlayerId, PlayerRoundState>;
  standings: Standings[];
  gameNames: string[];
  netted: NettedSettlement;
  /** Injectable for tests. Defaults to now. */
  completedAt?: string;
}

/** "pts" for the default abstract stake, otherwise the configured label. */
export function stakeUnit(stakeLabel: string): string {
  return stakeLabel === 'points' ? 'pts' : stakeLabel;
}

export function summarizeRound({ round, holes, handicaps, standings, gameNames, netted, completedAt }: SummarizeInput): RoundSummary {
  const netToPar: Record<PlayerId, number> = {};
  const players: RoundSummaryPlayer[] = round.players.map((p) => {
    const hcp = handicaps[p.id];
    const gross = totals(round.holeResults, holes, p.id, 'gross');
    const net = totals(round.holeResults, holes, p.id, 'net', hcp);
    netToPar[p.id] = net.toPar;
    return {
      id: p.id,
      name: p.name,
      gross: gross.strokes,
      net: net.strokes,
      grossToPar: gross.toPar,
      playingHandicap: hcp?.playingHandicap ?? 0,
      holesPickedUp: gross.holesPickedUp,
    };
  });

  // Ranked by score to par over the holes each player finished, so an unfinished or picked-up card is compared fairly.
  const anyStrokes = players.some((p) => p.playingHandicap !== 0);
  const toPar = (p: RoundSummaryPlayer) => (anyStrokes ? (netToPar[p.id] ?? 0) : p.grossToPar);
  const ranked = [...players].sort((a, b) => toPar(a) - toPar(b));
  const leader = ranked[0] ?? players[0];
  const leaderId = leader?.id ?? round.players[0]?.id ?? '';
  // A winner needs someone to beat, and no tie at the top.
  const winnerId = ranked.length >= 2 && toPar(ranked[0]!) < toPar(ranked[1]!) ? ranked[0]!.id : undefined;
  const holesScored = holes.filter((h) => round.holeResults.some((r) => r.holeNumber === h.number && Object.keys(r.scores).length > 0)).length;

  const stakeTotal = netted.totals[leaderId] ?? 0;
  let resultLabel: string;
  if (stakeTotal !== 0) {
    resultLabel = formatStake(formatSigned(stakeTotal).replace(/^(\d)/, '+$1'), round.settings.stakeLabel);
  } else {
    const points = standings.flatMap((s) => s.lines).find((l) => l.playerId === leaderId && typeof l.value === 'number' && l.value > 0);
    resultLabel = points ? `${points.value} pts` : formatToPar(leader?.grossToPar ?? 0);
  }

  const tee = round.course.teeBoxes.find((t) => t.id === round.teeBoxId);
  return {
    id: round.id,
    completedAt: completedAt ?? new Date().toISOString(),
    courseName: round.course.name,
    teeName: tee?.name,
    holeCount: round.settings.holeCount,
    gameNames,
    players,
    leaderId,
    ...(winnerId ? { winnerId } : {}),
    holesScored,
    resultLabel,
  };
}

/** One player's line on the results: scores, the handicap behind the net, and the points tally across games. */
export interface ResultRow {
  id: PlayerId;
  name: string;
  gross: number;
  grossToPar: number;
  net: number;
  netToPar: number;
  /** Course handicap (the "CH 13" caption). */
  courseHandicap: number;
  /** Strokes actually received after the allowance (what net subtracts). */
  playingHandicap: number;
  /** Holes with a number (a pick-up is not one). */
  holesScored: number;
  pickedUp: number;
  /** Net points across every game, + up / − down. */
  points: number;
}

export function resultRows(round: Round, holes: Hole[], handicaps: Record<PlayerId, PlayerRoundState>, netted: NettedSettlement): ResultRow[] {
  return round.players.map((p) => {
    const hcp = handicaps[p.id];
    const gross = totals(round.holeResults, holes, p.id, 'gross');
    const net = totals(round.holeResults, holes, p.id, 'net', hcp);
    return {
      id: p.id,
      name: p.name,
      gross: gross.strokes,
      grossToPar: gross.toPar,
      net: net.strokes,
      netToPar: net.toPar,
      courseHandicap: hcp?.courseHandicap ?? 0,
      playingHandicap: hcp?.playingHandicap ?? 0,
      holesScored: gross.holesScored,
      pickedUp: gross.holesPickedUp,
      points: netted.totals[p.id] ?? 0,
    };
  });
}

/**
 * The headline result in words: "Maya won" over "Net 70 (−2) · Gross 82", "Maya and Sam tied" over "Net −2", or for a
 * round on your own "Alex shot 84" over "+12 over 18 holes". Ranked net when anyone gets strokes, else gross, over the
 * holes each player finished.
 */
export function resultHeadline(rows: ResultRow[], useNet: boolean): { title: string; detail: string | null } {
  const scored = rows.filter((r) => r.holesScored > 0);
  if (scored.length === 0) return { title: 'No scores entered', detail: null };
  if (rows.length === 1) {
    const r = scored[0]!;
    return { title: `${r.name} shot ${r.gross}`, detail: `${formatToPar(r.grossToPar)} over ${r.holesScored} ${r.holesScored === 1 ? 'hole' : 'holes'}${useNet ? ` · net ${r.net}` : ''}` };
  }
  const toPar = (r: ResultRow) => (useNet ? r.netToPar : r.grossToPar);
  const best = Math.min(...scored.map(toPar));
  const top = scored.filter((r) => toPar(r) === best);
  if (top.length === 1) {
    const r = top[0]!;
    return { title: `${r.name} won`, detail: useNet ? `Net ${r.net} (${formatToPar(r.netToPar)}) · Gross ${r.gross}` : `${r.gross} (${formatToPar(r.grossToPar)})` };
  }
  const who = top.length === 2 ? `${top[0]!.name} and ${top[1]!.name}` : `${top.length} players`;
  return { title: `${who} tied`, detail: `${useNet ? 'Net ' : ''}${formatToPar(best)}` };
}

/**
 * How the points net out between two players, in words: "Maya +20 vs Jordan", then each game's part. Never "owes" or
 * "pays": points are a tally, nothing changes hands.
 */
export function pointsBreakdown(pair: NettedPair, nameOf: (id: PlayerId) => string, stakeLabel: string): { line: string; parts: string[] } {
  return {
    line: `${nameOf(pair.to)} ${formatStake(`+${pair.amount}`, stakeLabel)} vs ${nameOf(pair.from)}`,
    parts: pair.contributions.map((c) => (c.to === pair.to ? c.reason : `${c.reason} (to ${nameOf(c.to)})`)),
  };
}

/** Shape check for a persisted summary (duck-typed; used by the history store and migrations). */
export function isSummary(v: unknown): v is RoundSummary {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<RoundSummary>;
  return typeof s.id === 'string' && typeof s.courseName === 'string' && Array.isArray(s.players) && typeof s.completedAt === 'string';
}

/** Shape check for a persisted round: enough structure to render a card and rerun the games. */
export function isRound(v: unknown): v is Round {
  if (!v || typeof v !== 'object') return false;
  const r = v as Partial<Round>;
  return typeof r.id === 'string' && Array.isArray(r.players) && Array.isArray(r.holeResults) && !!r.course && Array.isArray(r.course.holes) && r.course.holes.length > 0 && !!r.settings;
}
