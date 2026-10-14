// Versioned migrations for everything under bb:*. Runs once at launch before the stores hydrate.
import type { StorageAdapter } from './adapter';
import { SCHEMA_VERSION, STORAGE_KEYS } from './adapter';
import { newId } from '@/lib/id';
import { getGame } from '@/games/registry';

export interface Migration {
  /** The version this migration produces. */
  to: number;
  run(storage: StorageAdapter): Promise<void>;
}

/** v1 → v2: history entries become { summary, round? } instead of bare summaries. Idempotent. */
async function wrapHistoryEntries(storage: StorageAdapter): Promise<void> {
  const saved = await storage.get<unknown>(STORAGE_KEYS.roundHistory);
  if (!Array.isArray(saved)) return;
  const wrapped = saved.map((item) => (item && typeof item === 'object' && 'summary' in (item as object) ? item : { summary: item }));
  await storage.set(STORAGE_KEYS.roundHistory, wrapped);
}

/** v2 → v3: the recent-players list becomes player profiles (index carried over, no history). Idempotent. */
async function seedProfilesFromRecentPlayers(storage: StorageAdapter): Promise<void> {
  const recent = await storage.get<unknown>(STORAGE_KEYS.recentPlayers);
  const existing = await storage.get<unknown>(STORAGE_KEYS.playerProfiles);
  if (Array.isArray(recent) && !Array.isArray(existing)) {
    const at = new Date().toISOString();
    const seen = new Set<string>();
    const profiles = [];
    for (const item of recent) {
      const o = item && typeof item === 'object' ? (item as { name?: unknown; handicapIndex?: unknown }) : {};
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      const handicapIndex = typeof o.handicapIndex === 'number' ? o.handicapIndex : undefined;
      profiles.push({ id: newId('pr'), name, handicapIndex, indexHistory: handicapIndex == null ? [] : [{ at, index: handicapIndex }], createdAt: at, lastPlayedAt: at });
    }
    await storage.set(STORAGE_KEYS.playerProfiles, profiles);
  }
  await storage.remove(STORAGE_KEYS.recentPlayers);
}

type StoredRound = { players?: { id?: unknown; name?: unknown }[]; holeResults?: { gameInputs?: Record<string, Record<string, unknown> | undefined> }[] };

/**
 * A game prompt that picks a player (Wolf's partner, Bingo Bango Bongo) stores the player's id, not their name: two
 * players can share a name. Only a name that matches exactly one player in that round changes. Returns the same object
 * when nothing changes. Idempotent.
 */
export function promptAnswersToIds<T>(round: T): T {
  const r = round as unknown as StoredRound;
  if (!r || typeof r !== 'object' || !Array.isArray(r.players) || !Array.isArray(r.holeResults)) return round;
  const players = r.players.filter((p): p is { id: string; name: string } => typeof p?.id === 'string' && typeof p?.name === 'string');
  const ids = new Set(players.map((p) => p.id));
  const idForName = (name: string) => {
    const hits = players.filter((p) => p.name === name);
    return hits.length === 1 ? hits[0]!.id : undefined;
  };
  let changed = false;
  const holeResults = r.holeResults.map((h) => {
    if (!h || typeof h !== 'object' || !h.gameInputs) return h;
    let holeChanged = false;
    const gameInputs: Record<string, Record<string, unknown> | undefined> = {};
    for (const [gameId, inputs] of Object.entries(h.gameInputs)) {
      const keys = (getGame(gameId)?.holeInputs ?? []).filter((s) => s.type === 'player').map((s) => s.key);
      let next = inputs;
      for (const key of keys) {
        const v = inputs?.[key];
        if (typeof v !== 'string' || ids.has(v)) continue;
        const id = idForName(v);
        if (id) {
          next = { ...next, [key]: id };
          holeChanged = true;
        }
      }
      gameInputs[gameId] = next;
    }
    if (!holeChanged) return h;
    changed = true;
    return { ...h, gameInputs };
  });
  return changed ? ({ ...(round as object), holeResults } as T) : round;
}

/** v3 → v4: player prompts in the round in play and in history store ids (see promptAnswersToIds). */
async function storePromptAnswersAsIds(storage: StorageAdapter): Promise<void> {
  const active = await storage.get<unknown>(STORAGE_KEYS.activeRound);
  if (active) {
    const next = promptAnswersToIds(active);
    if (next !== active) await storage.set(STORAGE_KEYS.activeRound, next);
  }
  const history = await storage.get<unknown>(STORAGE_KEYS.roundHistory);
  if (Array.isArray(history)) {
    let changed = false;
    const next = history.map((entry) => {
      const round = entry && typeof entry === 'object' ? (entry as { round?: unknown }).round : undefined;
      if (!round) return entry;
      const fixed = promptAnswersToIds(round);
      if (fixed === round) return entry;
      changed = true;
      return { ...(entry as object), round: fixed };
    });
    if (changed) await storage.set(STORAGE_KEYS.roundHistory, next);
  }
}

export const MIGRATIONS: Migration[] = [
  { to: 2, run: wrapHistoryEntries },
  { to: 3, run: seedProfilesFromRecentPlayers },
  { to: 4, run: storePromptAnswersAsIds },
];

const DATA_KEYS = [STORAGE_KEYS.activeRound, STORAGE_KEYS.roundHistory, STORAGE_KEYS.recentPlayers, STORAGE_KEYS.recentCourses, STORAGE_KEYS.userCourses];

/**
 * Bring stored data up to SCHEMA_VERSION. A fresh install is stamped and skipped. Data written by a
 * newer app version is left untouched (stores hydrate best-effort).
 */
export async function migrate(storage: StorageAdapter): Promise<{ from: number; to: number }> {
  const stored = await storage.get<number>(STORAGE_KEYS.schemaVersion);
  let from: number;
  if (typeof stored === 'number') from = stored;
  else {
    let any = false;
    for (const k of DATA_KEYS) if ((await storage.get<unknown>(k)) != null) any = true;
    from = any ? 1 : SCHEMA_VERSION;
  }
  if (from >= SCHEMA_VERSION) {
    if (stored !== SCHEMA_VERSION && from === SCHEMA_VERSION) await storage.set(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION);
    return { from, to: from };
  }
  let version = from;
  for (const m of MIGRATIONS) {
    if (m.to <= version) continue;
    await m.run(storage);
    version = m.to;
    await storage.set(STORAGE_KEYS.schemaVersion, version);
  }
  return { from, to: version };
}
