// Cloud sync, the I/O part. Watches the stores, queues every local change in a persisted outbox, pushes it to Supabase,
// and pulls other devices' changes back in. The rules (what changed, who wins, what an error means) live in lib/sync.ts.
//
// - Offline first: changes wait in the outbox (bb:sync:outbox) until there is signal; nothing on the scorecard waits.
// - First sign-in on a phone pulls the account's data, then uploads whatever this phone had that the account did not.
//   That upload only happens after a pull succeeds, so an offline first start never overwrites the account.
// - Remote changes are written into the stores with `applying` set, so they are never echoed back up.
// - A write the server refuses for its data is set aside (meta.rejected) so it stops blocking the queue; network
//   errors back off and retry; an auth error pauses sync until the person signs in again.
// - Another account's data on this phone is never uploaded: services/auth asks first and clears the phone if told to.
import { AppState, type NativeEventSubscription } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { storage, STORAGE_KEYS, useCourseStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore, useSyncStatus, type Preferences } from '@/store';
import {
  applyRemote,
  backoffMs,
  chunkByBytes,
  classifySyncError,
  coalesceOutbox,
  diffSnapshots,
  latestSyncedAt,
  pruneOutbox,
  pullSince,
  remoteWins,
  stampKey,
  type OutboxChange,
  type RemoteRow,
  type Snapshot,
  type SyncTable,
} from '@/lib/sync';
import { mergeProfile, repointGroups, repointRound } from '@/lib/profiles';
import type { Course, HistoryEntry, PlayerGroup, PlayerProfile, Round } from '@/types';
import { supabase } from './supabase';
import { captureError } from './telemetry';

const OUTBOX_KEY = 'bb:sync:outbox';
const META_KEY = 'bb:sync:meta';
const FLUSH_DELAY = 2000;
const SETTINGS_ID = 'settings';

/** A change the server refused as it is (bad data, too large). Kept aside; Settings offers a retry. */
interface RejectedChange extends OutboxChange {
  code?: string;
  rejectedAt: string;
}

interface Meta {
  userId?: string;
  /** Newest server `synced_at` seen; the next pull asks for anything after it (minus a small overlap). */
  lastPulledAt?: string;
  /** Last known edit time per entity (`table:id`), local or remote. */
  stamps: Record<string, string>;
  /** This phone's own data has been uploaded once for this account (after the first successful pull). */
  seeded?: boolean;
  rejected?: RejectedChange[];
}

/** Preferences that follow the person between phones. Device things (haptics, privacy answers, photo file) stay put. */
const SYNCED_PREFS = ['defaultStakeLabel', 'defaultAllowance', 'bag', 'homeArea', 'meProfileId'] as const;
type SyncedPrefs = Pick<Preferences, (typeof SYNCED_PREFS)[number]>;

interface TableSpec {
  table: SyncTable;
  snapshot(): Snapshot;
  apply(next: Snapshot): void;
  subscribe(onChange: () => void): () => void;
}

const byId = <T,>(items: T[], id: (t: T) => string, status?: (t: T) => 'in-progress' | 'complete'): Snapshot => Object.fromEntries(items.map((t) => [id(t), { data: t, ...(status ? { status: status(t) } : {}) }]));

/** Keep the local order for entities we already had; new ones go at the end. */
function ordered<T>(prev: T[], next: Snapshot, id: (t: T) => string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const t of prev) {
    const k = id(t);
    if (next[k]) {
      out.push(next[k]!.data as T);
      seen.add(k);
    }
  }
  for (const [k, item] of Object.entries(next)) if (!seen.has(k)) out.push(item.data as T);
  return out;
}

const TABLES: TableSpec[] = [
  {
    table: 'people',
    snapshot: () => byId(useProfileStore.getState().profiles, (p) => p.id),
    apply: (next) => {
      const profiles = ordered<PlayerProfile>(useProfileStore.getState().profiles, next, (p) => p.id);
      useProfileStore.setState({ profiles });
      void storage.set(STORAGE_KEYS.playerProfiles, profiles);
    },
    subscribe: (cb) => useProfileStore.subscribe((s, p) => s.profiles !== p.profiles && cb()),
  },
  {
    table: 'player_groups',
    snapshot: () => byId(useProfileStore.getState().groups, (g) => g.id),
    apply: (next) => {
      const groups = ordered<PlayerGroup>(useProfileStore.getState().groups, next, (g) => g.id);
      useProfileStore.setState({ groups });
      void storage.set(STORAGE_KEYS.playerGroups, groups);
    },
    subscribe: (cb) => useProfileStore.subscribe((s, p) => s.groups !== p.groups && cb()),
  },
  {
    table: 'courses',
    snapshot: () => byId(useCourseStore.getState().userCourses, (c) => c.id),
    apply: (next) => {
      const userCourses = ordered<Course>(useCourseStore.getState().userCourses, next, (c) => c.id);
      useCourseStore.setState({ userCourses });
      void storage.set(STORAGE_KEYS.userCourses, userCourses);
    },
    subscribe: (cb) => useCourseStore.subscribe((s, p) => s.userCourses !== p.userCourses && cb()),
  },
  {
    // History entries ('complete') and the round in play ('in-progress') share one table, keyed by round id.
    table: 'rounds',
    snapshot: () => {
      const snap = byId(useHistoryStore.getState().entries, (e) => e.summary.id, () => 'complete');
      const live = useRoundStore.getState().round;
      if (live && live.status === 'in-progress' && !snap[live.id]) snap[live.id] = { data: live, status: 'in-progress' };
      return snap;
    },
    apply: (next) => {
      const entries = Object.values(next)
        .filter((i) => i.status !== 'in-progress')
        .map((i) => i.data as HistoryEntry)
        .sort((a, b) => b.summary.completedAt.localeCompare(a.summary.completedAt));
      useHistoryStore.setState({ entries });
      void storage.set(STORAGE_KEYS.roundHistory, entries);
      // The round in play: resume one started on another phone, follow its edits, and drop it once it is finished
      // or discarded elsewhere. A different round already in play here is left alone.
      const local = useRoundStore.getState().round;
      const remoteLive = Object.entries(next).find(([, i]) => i.status === 'in-progress');
      if (local) {
        const mine = next[local.id];
        if (!mine || mine.status === 'complete') setRound(null);
        else if (mine.status === 'in-progress') setRound(mine.data as Round);
      } else if (remoteLive) setRound(remoteLive[1].data as Round);
    },
    subscribe: (cb) => {
      const a = useHistoryStore.subscribe((s, p) => s.entries !== p.entries && cb());
      const b = useRoundStore.subscribe((s, p) => s.round !== p.round && cb());
      return () => (a(), b());
    },
  },
  {
    table: 'user_settings',
    snapshot: () => {
      const p = usePreferences.getState();
      const data: Partial<SyncedPrefs> = {};
      for (const k of SYNCED_PREFS) if (p[k] !== undefined) (data as Record<string, unknown>)[k] = p[k];
      return { [SETTINGS_ID]: { data } };
    },
    apply: (next) => {
      const data = next[SETTINGS_ID]?.data as Partial<SyncedPrefs> | undefined;
      if (data) usePreferences.getState().update(data);
    },
    subscribe: (cb) => usePreferences.subscribe((s, p) => SYNCED_PREFS.some((k) => s[k] !== p[k]) && cb()),
  },
];

function setRound(round: Round | null): void {
  useRoundStore.setState({ round, undo: [] });
  void (round ? storage.set(STORAGE_KEYS.activeRound, round) : storage.remove(STORAGE_KEYS.activeRound));
}

// ---------- Engine state ----------

let userId: string | null = null;
let meta: Meta = { stamps: {} };
let outbox: OutboxChange[] = [];
let snapshots: Partial<Record<SyncTable, Snapshot>> = {};
let applying = false;
/** Waiting for the person to sign in again (the server said the session is not valid). */
let paused = false;
/** Consecutive failed flushes, for backoff. */
let attempt = 0;
let flushing: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let teardown: (() => void)[] = [];
const now = () => new Date().toISOString();

const persistOutbox = () => storage.set(OUTBOX_KEY, outbox);
const persistMeta = () => storage.set(META_KEY, meta);
const report = (patch: Parameters<ReturnType<typeof useSyncStatus.getState>['set']>[0]) => useSyncStatus.getState().set({ pending: outbox.length, rejected: meta.rejected?.length ?? 0, ...patch });

function enqueue(changes: OutboxChange[]): void {
  if (!changes.length) return;
  outbox = coalesceOutbox(outbox, changes);
  for (const c of changes) meta.stamps[stampKey(c.table, c.id)] = c.updatedAt;
  void persistOutbox();
  void persistMeta();
  report({});
  scheduleFlush();
}

/** A store changed: queue what is new, edited or removed since the last look. */
function onLocalChange(spec: TableSpec): void {
  if (applying || !userId) return;
  const prev = snapshots[spec.table] ?? {};
  const next = spec.snapshot();
  snapshots[spec.table] = next;
  const { upserts, deletes } = diffSnapshots(prev, next);
  const at = now();
  enqueue([...upserts.map((id) => ({ table: spec.table, id, data: next[id]!.data, status: next[id]!.status, updatedAt: at })), ...deletes.map((id) => ({ table: spec.table, id, data: null, updatedAt: at }))]);
}

function scheduleFlush(delay = FLUSH_DELAY): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, delay);
}

type Outcome = 'ok' | 'transient' | 'auth';
type WriteError = { message?: string; code?: string; status?: number };

function toRow(table: SyncTable, c: OutboxChange): Record<string, unknown> {
  return table === 'user_settings'
    ? { owner: userId, data: c.data ?? {}, updated_at: c.updatedAt }
    : { owner: userId, id: c.id, data: c.data ?? {}, updated_at: c.updatedAt, deleted_at: c.data === null ? c.updatedAt : null, ...(table === 'rounds' ? { status: c.status ?? 'complete' } : {}) };
}

/** Drop exactly what was sent; anything edited again meanwhile stays queued. */
function markSent(changes: OutboxChange[]): void {
  const sent = new Set(changes.map((c) => `${stampKey(c.table, c.id)}@${c.updatedAt}`));
  outbox = outbox.filter((c) => !sent.has(`${stampKey(c.table, c.id)}@${c.updatedAt}`));
}

/** Set aside a change the server will never accept as it is. Only the table and error code are reported. */
async function quarantine(change: OutboxChange, code: string | undefined): Promise<void> {
  markSent([change]);
  meta.rejected = [...(meta.rejected ?? []).filter((r) => !(r.table === change.table && r.id === change.id)), { ...change, code, rejectedAt: now() }];
  await Promise.all([persistOutbox(), persistMeta()]);
  captureError(new Error(`Sync: the server refused a ${change.table} row (${code ?? 'no code'})`));
}

/** Upsert one batch. A data error splits the batch until the bad row is found and set aside; the rest still goes. */
async function send(table: SyncTable, changes: OutboxChange[]): Promise<{ outcome: Outcome; error?: string }> {
  let error: WriteError | null = null;
  try {
    const res = await supabase()
      .from(table)
      .upsert(
        changes.map((c) => toRow(table, c)),
        { onConflict: table === 'user_settings' ? 'owner' : 'owner,id' },
      );
    if (res.error) error = { message: res.error.message, code: res.error.code, status: (res as { status?: number }).status };
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) };
  }
  if (!error) {
    markSent(changes);
    await persistOutbox();
    return { outcome: 'ok' };
  }
  const kind = classifySyncError(error);
  if (kind !== 'row') return { outcome: kind, error: error.message };
  if (changes.length === 1) {
    await quarantine(changes[0]!, error.code);
    return { outcome: 'ok' };
  }
  const mid = Math.ceil(changes.length / 2);
  const first = await send(table, changes.slice(0, mid));
  if (first.outcome !== 'ok') return first;
  return send(table, changes.slice(mid));
}

/** Send everything waiting. Safe to call any time; concurrent calls share one run. */
export function flush(): Promise<void> {
  if (!userId || paused) return Promise.resolve();
  flushing ??= (async () => {
    const batch = [...outbox];
    if (!batch.length) return;
    report({ phase: 'syncing' });
    let outcome: Outcome = 'ok';
    let error: string | undefined;
    tables: for (const table of [...new Set(batch.map((c) => c.table))]) {
      for (const chunk of chunkByBytes(batch.filter((c) => c.table === table))) {
        const r = await send(table, chunk);
        if (r.outcome !== 'ok') {
          outcome = r.outcome;
          error = r.error;
          break tables;
        }
      }
    }
    if (outcome === 'ok') {
      attempt = 0;
      report({ phase: 'idle', lastSyncedAt: now(), error: undefined });
    } else if (outcome === 'auth') {
      paused = true;
      report({ phase: 'error', error, authPaused: true });
    } else {
      const offline = !(await NetInfo.fetch().catch(() => ({ isConnected: true }))).isConnected;
      report({ phase: offline ? 'offline' : 'error', error });
      scheduleFlush(backoffMs(attempt++));
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/**
 * Bring in whatever other devices changed since the last pull. Returns whether it got through.
 * `keepLocalOverTombstones` (restoring a backup): a remote delete does not remove what the backup brought back.
 */
export async function pull(opts: { keepLocalOverTombstones?: boolean } = {}): Promise<boolean> {
  if (!userId || paused) return false;
  report({ phase: 'syncing' });
  try {
    let newest = meta.lastPulledAt;
    const since = pullSince(meta.lastPulledAt);
    for (const spec of TABLES) {
      const columns = spec.table === 'user_settings' ? 'data, updated_at, synced_at' : `id, data, updated_at, deleted_at, synced_at${spec.table === 'rounds' ? ', status' : ''}`;
      let query = supabase().from(spec.table).select(columns).order('synced_at', { ascending: true });
      if (since) query = query.gt('synced_at', since);
      const res = await query;
      if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code, status: (res as { status?: number }).status });
      const rows = ((res.data ?? []) as unknown as Partial<RemoteRow>[]).map((r) => ({ id: r.id ?? SETTINGS_ID, data: r.data, status: r.status, updated_at: r.updated_at!, deleted_at: r.deleted_at ?? null, synced_at: r.synced_at! }));
      newest = latestSyncedAt(rows, newest);
      const current = snapshots[spec.table] ?? spec.snapshot();
      let winners = rows.filter((r) => remoteWins(r, meta.stamps[stampKey(spec.table, r.id)], outbox.find((c) => c.table === spec.table && c.id === r.id)));
      if (opts.keepLocalOverTombstones) winners = winners.filter((r) => !(r.deleted_at && current[r.id]));
      if (!winners.length) continue;
      const next = applyRemote(current, winners);
      applying = true;
      try {
        spec.apply(next);
      } finally {
        applying = false;
      }
      snapshots[spec.table] = spec.snapshot();
      for (const r of winners) meta.stamps[stampKey(spec.table, r.id)] = r.updated_at;
      const pruned = pruneOutbox(outbox, spec.table, winners);
      if (pruned.length !== outbox.length) {
        outbox = pruned;
        await persistOutbox();
      }
    }
    meta.lastPulledAt = newest;
    await persistMeta();
    report({ phase: 'idle', lastSyncedAt: now(), error: undefined });
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (classifySyncError(e as WriteError) === 'auth') {
      paused = true;
      report({ phase: 'error', error: message, authPaused: true });
    } else {
      const offline = !(await NetInfo.fetch().catch(() => ({ isConnected: true }))).isConnected;
      report({ phase: offline ? 'offline' : 'error', error: message });
    }
    return false;
  }
}

/** Once per account on this phone, after a pull got through: queue whatever the account does not have yet. */
function seedIfNeeded(): void {
  if (!userId || meta.seeded) return;
  const at = now();
  const missing: OutboxChange[] = [];
  for (const spec of TABLES) {
    snapshots[spec.table] = spec.snapshot();
    for (const [id, item] of Object.entries(snapshots[spec.table] ?? {})) if (!meta.stamps[stampKey(spec.table, id)]) missing.push({ table: spec.table, id, data: item.data, status: item.status, updatedAt: at });
  }
  meta.seeded = true;
  enqueue(missing);
  void persistMeta();
}

/**
 * The first pull may bring the account's own "me" while this phone already had one (made before signing in). They are
 * the same person: this phone's rounds and groups now point at the account's "me", whose index history absorbs this
 * phone's, and the duplicate goes. Only this phone's not-yet-uploaded data references the duplicate.
 */
function reconcileMe(meBefore: string | undefined): void {
  const meAfter = usePreferences.getState().meProfileId;
  if (!meBefore || !meAfter || meBefore === meAfter) return;
  const { profiles, groups } = useProfileStore.getState();
  const local = profiles.find((p) => p.id === meBefore);
  const account = profiles.find((p) => p.id === meAfter);
  if (!local || !account) return;
  const merged = mergeProfile(account, local);
  const nextProfiles = profiles.filter((p) => p.id !== meBefore).map((p) => (p.id === meAfter ? merged : p));
  const nextGroups = repointGroups(groups, meBefore, meAfter);
  const entries = useHistoryStore.getState().entries.map((e) => (e.round ? { ...e, round: repointRound(e.round, meBefore, meAfter) } : e));
  const live = useRoundStore.getState().round;
  useProfileStore.setState({ profiles: nextProfiles, groups: nextGroups });
  useHistoryStore.setState({ entries });
  void storage.set(STORAGE_KEYS.playerProfiles, nextProfiles);
  void storage.set(STORAGE_KEYS.playerGroups, nextGroups);
  void storage.set(STORAGE_KEYS.roundHistory, entries);
  if (live) setRound(repointRound(live, meBefore, meAfter));
  for (const spec of TABLES) snapshots[spec.table] = spec.snapshot();
  // The account's "me" changed (merged history): send it. The duplicate was never uploaded, so nothing to delete.
  enqueue([{ table: 'people', id: meAfter, data: merged, updatedAt: now() }]);
}

/** Pull, upload anything this phone still owes the account, then send the queue. */
async function syncNow(): Promise<void> {
  if (!userId || paused) return;
  if (await pull()) seedIfNeeded();
  await flush();
}

let starting: Promise<void> = Promise.resolve();
let pulled: Promise<{ pulled: boolean }> = Promise.resolve({ pulled: false });

/** Resolves once the current account's first pull is done: `pulled` says whether it got through (false when offline). */
export function whenSyncStarted(): Promise<{ pulled: boolean }> {
  return pulled;
}

/**
 * Start syncing for a signed-in account: pull, upload this phone's data once, then keep both directions going.
 * Resolves after the first pull and upload. `restoring`: a backup was just restored, keep it over remote deletes.
 */
export function startSync(forUser: string, opts: { restoring?: boolean } = {}): Promise<void> {
  let markPulled: (r: { pulled: boolean }) => void = () => undefined;
  pulled = new Promise((resolve) => (markPulled = resolve));
  starting = run(forUser, markPulled, opts).catch(() => markPulled({ pulled: false }));
  return starting;
}

async function run(forUser: string, markPulled: (r: { pulled: boolean }) => void, opts: { restoring?: boolean }): Promise<void> {
  stopSync();
  meta = (await storage.get<Meta>(META_KEY)) ?? { stamps: {} };
  outbox = (await storage.get<OutboxChange[]>(OUTBOX_KEY)) ?? [];
  if (meta.userId && meta.userId !== forUser) {
    // Another account's data is on this phone. services/auth asks before anything is uploaded (and clears the phone if
    // told to), so reaching here means that step was skipped: refuse rather than leak the other account's rounds.
    markPulled({ pulled: false });
    report({ phase: 'error', error: 'This phone has another account’s data.' });
    return;
  }
  if (!meta.userId) {
    meta = { userId: forUser, stamps: {} };
    outbox = [];
    await Promise.all([persistMeta(), persistOutbox()]);
  }
  userId = forUser;
  paused = false;
  attempt = 0;
  report({ authPaused: false });
  const meBefore = usePreferences.getState().meProfileId;
  for (const spec of TABLES) snapshots[spec.table] = spec.snapshot();
  // Pull first: on a new phone the account's data (and its settings) must win over this phone's blank defaults.
  const ok = await pull({ keepLocalOverTombstones: opts.restoring });
  if (ok && !meta.seeded) reconcileMe(meBefore);
  markPulled({ pulled: ok });
  if (ok) seedIfNeeded();
  await flush();

  for (const spec of TABLES) teardown.push(spec.subscribe(() => onLocalChange(spec)));
  const app: NativeEventSubscription = AppState.addEventListener('change', (s) => {
    if (s === 'active') void syncNow();
  });
  teardown.push(() => app.remove());
  teardown.push(
    NetInfo.addEventListener((s) => {
      if (s.isConnected && (outbox.length || !meta.seeded)) void syncNow();
    }),
  );
}

export function stopSync(): void {
  for (const off of teardown) off();
  teardown = [];
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  userId = null;
  snapshots = {};
}

/** The session is good again (signed in again as the same person): pick up where sync stopped. */
export function resumeSync(): void {
  if (!paused) return;
  paused = false;
  attempt = 0;
  report({ authPaused: false });
  void syncNow();
}

/** Try to send everything, giving up after `ms`. Returns how many changes are still waiting. */
export async function flushWithin(ms: number): Promise<number> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([flush(), new Promise<void>((resolve) => (timer = setTimeout(resolve, ms)))]);
  if (timer) clearTimeout(timer);
  return outbox.length;
}

/** Put the changes the server refused back in the queue and try again (Settings › "Retry"). */
export function retryRejected(): Promise<void> {
  const rejected = meta.rejected ?? [];
  if (!rejected.length) return Promise.resolve();
  meta.rejected = [];
  enqueue(rejected.map(({ code: _code, rejectedAt: _at, ...change }) => change));
  return flush();
}

/**
 * Restore a backup while signed in. The backup is merged with the account rather than replacing it: the account keeps
 * its newer copies, the backup brings back what the account lacks (even rounds deleted since), and nothing is deleted.
 */
export async function restoreWithSync(importBackup: () => Promise<void>): Promise<void> {
  const uid = userId;
  if (!uid) return importBackup();
  stopSync();
  await importBackup();
  meta = { userId: uid, stamps: {} };
  outbox = [];
  await Promise.all([persistMeta(), persistOutbox()]);
  await startSync(uid, { restoring: true });
}

/** The account this phone's data was last synced with, if any (another account signing in must ask first). */
export async function lastSyncedAccount(): Promise<string | undefined> {
  return (await storage.get<Meta>(META_KEY))?.userId;
}

/** Forget this phone's sync bookkeeping (sign-out, account deletion, switching accounts). */
export async function resetSync(): Promise<void> {
  stopSync();
  meta = { stamps: {} };
  outbox = [];
  paused = false;
  attempt = 0;
  await Promise.all([storage.remove(OUTBOX_KEY), storage.remove(META_KEY)]);
  useSyncStatus.getState().set({ phase: 'idle', pending: 0, rejected: 0, authPaused: false, lastSyncedAt: undefined, error: undefined });
}

/** Changes waiting to go up (tests and the Account status line). */
export function pendingChanges(): number {
  return outbox.length;
}
