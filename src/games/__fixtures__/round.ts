import type { ActiveGame, HoleResult, Player, Round } from '../../types';
import { cedarRidge, foursome, throughSix } from '../../lib/__fixtures__/cedarRidge';

export function makeRound(opts: { players?: Player[]; results?: HoleResult[]; games?: ActiveGame[]; holeCount?: 9 | 18 } = {}): Round {
  return {
    id: 'r1',
    createdAt: '2026-09-14T00:00:00Z',
    updatedAt: '2026-09-14T00:00:00Z',
    status: 'in-progress',
    course: cedarRidge,
    teeBoxId: 'blue',
    players: opts.players ?? foursome,
    games: opts.games ?? [],
    settings: { holeCount: opts.holeCount ?? 18, allowance: 100, stakeLabel: 'points' },
    holeResults: opts.results ?? throughSix,
    currentHole: 7,
  };
}

export function active(gameId: string, config: ActiveGame['config'] = {}, basis: ActiveGame['basis'] = 'net', playerIds?: string[]): ActiveGame {
  return { gameId, config, basis, playerIds };
}

/** Build hole results from per-player arrays: scores[playerId] = [h1, h2, ...]. */
export function resultsFrom(scores: Record<string, (number | null)[]>): HoleResult[] {
  const n = Math.max(...Object.values(scores).map((a) => a.length));
  const out: HoleResult[] = [];
  for (let i = 0; i < n; i++) {
    const s: HoleResult['scores'] = {};
    for (const [id, arr] of Object.entries(scores)) if (i < arr.length) s[id] = arr[i]!;
    out.push({ holeNumber: i + 1, scores: s });
  }
  return out;
}
