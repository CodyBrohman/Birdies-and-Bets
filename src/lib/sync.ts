// Cloud sync, the pure part: what changed locally, what to send, and which remote rows win.
// Last-write-wins per entity by the time it was edited; deletes travel as tombstones. No I/O here.

export type SyncTable = 'rounds' | 'people' | 'player_groups' | 'courses' | 'user_settings';

/** One entity as it is stored remotely: the app's own JSON in `data`. */
export interface SyncItem {
  data: unknown;
  /** rounds only: 'in-progress' (the active round) or 'complete' (history). */
  status?: 'in-progress' | 'complete';
}

/** A local change waiting to go up. `data` is null for a delete. */
export interface OutboxChange {
  table: SyncTable;
  id: string;
  data: unknown | null;
  status?: SyncItem['status'];
  /** When it was edited on this phone, ISO. */
  updatedAt: string;
}

/** A row as it comes down from the server. */
export interface RemoteRow {
  id: string;
  data: unknown;
  status?: SyncItem['status'];
  updated_at: string;
  deleted_at: string | null;
  synced_at: string;
}

export type Snapshot = Record<string, SyncItem>;

export const stampKey = (table: SyncTable, id: string) => `${table}:${id}`;

/** Stable JSON for comparing two versions of an entity (object key order ignored). */
export function stableJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'undefined';
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
    .join(',')}}`;
}

/** What changed between two snapshots of one table: ids to upsert (new or edited) and ids to delete. */
export function diffSnapshots(prev: Snapshot, next: Snapshot): { upserts: string[]; deletes: string[] } {
  const upserts: string[] = [];
  const deletes: string[] = [];
  for (const [id, item] of Object.entries(next)) {
    const before = prev[id];
    if (!before || before.status !== item.status || stableJson(before.data) !== stableJson(item.data)) upserts.push(id);
  }
  for (const id of Object.keys(prev)) if (!(id in next)) deletes.push(id);
  return { upserts, deletes };
}

/** Add changes to the outbox, keeping only the newest change per entity, oldest first. */
export function coalesceOutbox(outbox: OutboxChange[], changes: OutboxChange[]): OutboxChange[] {
  const byKey = new Map<string, OutboxChange>();
  for (const c of [...outbox, ...changes]) {
    const key = stampKey(c.table, c.id);
    const existing = byKey.get(key);
    if (!existing || existing.updatedAt <= c.updatedAt) {
      byKey.delete(key);
      byKey.set(key, c);
    }
  }
  return [...byKey.values()];
}

/**
 * Whether a remote row should replace what this phone has. It wins only when it was edited after our last known edit of
 * that entity, so an older remote copy (or our own echo) never overwrites newer local work. Ties keep the local copy.
 */
export function remoteWins(row: RemoteRow, localStamp: string | undefined, pending: OutboxChange | undefined): boolean {
  const local = [localStamp, pending?.updatedAt].filter((s): s is string => !!s).sort().pop();
  return !local || row.updated_at > local;
}

/** Apply winning remote rows to a snapshot: tombstones remove, everything else replaces. */
export function applyRemote(snapshot: Snapshot, rows: RemoteRow[]): Snapshot {
  const next: Snapshot = { ...snapshot };
  for (const row of rows) {
    if (row.deleted_at) delete next[row.id];
    else next[row.id] = { data: row.data, ...(row.status ? { status: row.status } : {}) };
  }
  return next;
}

/** The newest server time among rows, for the next "synced since" pull. */
export function latestSyncedAt(rows: Pick<RemoteRow, 'synced_at'>[], since: string | undefined): string | undefined {
  return rows.reduce<string | undefined>((max, r) => (!max || r.synced_at > max ? r.synced_at : max), since);
}
