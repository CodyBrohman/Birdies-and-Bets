// Round history: boil a finished round down to what Home shows. Pure; imports only types/ and lib/.

import type { Hole } from '../types/course';
import type { PlayerId, PlayerRoundState } from '../types/player';
import type { Round, RoundSummary, RoundSummaryPlayer } from '../types/round';
import type { Standings } from '../types/game';
import { totals } from './scoring';
import { formatSigned, formatStake, formatToPar } from './format';
import type { NettedSettlement } from './settlement';

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
  const players: RoundSummaryPlayer[] = round.players.map((p) => {
    const hcp = handicaps[p.id];
    const gross = totals(round.holeResults, holes, p.id, 'gross');
    const net = totals(round.holeResults, holes, p.id, 'net', hcp);
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

  const anyStrokes = players.some((p) => p.playingHandicap !== 0);
  const leader = [...players].sort((a, b) => (anyStrokes ? a.net - b.net : a.gross - b.gross))[0] ?? players[0];
  const leaderId = leader?.id ?? round.players[0]?.id ?? '';

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
    resultLabel,
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
