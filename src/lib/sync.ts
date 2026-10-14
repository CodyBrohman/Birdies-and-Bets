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
    // Stores replace only what changed, so an untouched entity keeps its object: skip the JSON compare for it. This keeps
    // a score tap from re-serialising every finished round.
    if (before && before.data === item.data && before.status === item.status) continue;
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

/** How far back each pull re-reads. A slow write can commit with a `synced_at` just before a pull that already ran. */
export const PULL_OVERLAP_MS = 5 * 60 * 1000;

/** The `synced_at` lower bound for the next pull: the newest seen, minus the overlap. Re-pulled rows are no-ops. */
export function pullSince(lastPulledAt: string | undefined, overlapMs = PULL_OVERLAP_MS): string | undefined {
  if (!lastPulledAt) return undefined;
  const t = Date.parse(lastPulledAt);
  return Number.isNaN(t) ? undefined : new Date(t - overlapMs).toISOString();
}

/**
 * What a failed write means for the outbox:
 * - 'transient': no signal, a timeout, the server busy (5xx, 429). Keep it and retry with backoff.
 * - 'auth': the session is missing, expired or not allowed (401, 403, PGRST301, 42501). Pause until signed in again.
 * - 'row': this data can never be stored as it is (22xxx data errors, 23xxx constraints, 413 too large). Set it aside so
 *   it stops blocking everything queued behind it.
 */
export type SyncErrorKind = 'transient' | 'auth' | 'row';

export function classifySyncError(error: { message?: string; code?: string; status?: number } | null | undefined): SyncErrorKind {
  const code = error?.code ?? '';
  const status = error?.status;
  if (status === 401 || status === 403 || code === 'PGRST301' || code === '42501') return 'auth';
  if (status === 413 || /^2[23]/.test(code)) return 'row';
  return 'transient';
}

/** Wait before retry number `attempt` (0-based): 2 s doubling to a 5 min cap, with up to 20% jitter so phones spread out. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(2000 * 2 ** Math.max(0, attempt), 5 * 60 * 1000);
  return Math.round(base * (1 + 0.2 * random()));
}

/** Split rows into batches of roughly `maxBytes` of JSON each (a first upload of many rounds must not be one request). */
export function chunkByBytes<T>(rows: T[], maxBytes = 256 * 1024): T[][] {
  const out: T[][] = [];
  let batch: T[] = [];
  let size = 0;
  for (const row of rows) {
    const bytes = JSON.stringify(row)?.length ?? 0;
    if (batch.length && size + bytes > maxBytes) {
      out.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(row);
    size += bytes;
  }
  if (batch.length) out.push(batch);
  return out;
}

/** Drop queued changes that a remote row already beat (edited at or before it), so a stale edit is never re-sent. */
export function pruneOutbox(outbox: OutboxChange[], table: SyncTable, applied: Pick<RemoteRow, 'id' | 'updated_at'>[]): OutboxChange[] {
  const newest = new Map(applied.map((r) => [r.id, r.updated_at]));
  return outbox.filter((c) => {
    if (c.table !== table) return true;
    const remote = newest.get(c.id);
    return remote === undefined || c.updatedAt > remote;
  });
}
