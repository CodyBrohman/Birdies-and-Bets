// Versioned migrations for everything under bb:*. Runs once at launch before the stores hydrate.
import type { StorageAdapter } from './adapter';
import { SCHEMA_VERSION, STORAGE_KEYS } from './adapter';
import { newId } from '@/lib/id';

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

export const MIGRATIONS: Migration[] = [
  { to: 2, run: wrapHistoryEntries },
  { to: 3, run: seedProfilesFromRecentPlayers },
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
