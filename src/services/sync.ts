// Cloud sync, the I/O part. Watches the stores, queues every local change in a persisted outbox, pushes it to Supabase,
// and pulls other devices' changes back in. The rules (what changed, who wins) live in lib/sync.ts.
//
// - Offline first: changes wait in the outbox (bb:sync:outbox) until there is signal; nothing on the scorecard waits.
// - First sign-in on a phone pulls the account's data, then uploads whatever this phone had that the account did not.
// - Remote changes are written into the stores with `applying` set, so they are never echoed back up.
import { AppState, type NativeEventSubscription } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { storage, STORAGE_KEYS, useCourseStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore, useSyncStatus, type Preferences } from '@/store';
import { applyRemote, coalesceOutbox, diffSnapshots, latestSyncedAt, remoteWins, stampKey, type OutboxChange, type RemoteRow, type Snapshot, type SyncTable } from '@/lib/sync';
import type { Course, HistoryEntry, PlayerGroup, PlayerProfile, Round } from '@/types';
import { supabase } from './supabase';

const OUTBOX_KEY = 'bb:sync:outbox';
const META_KEY = 'bb:sync:meta';
const FLUSH_DELAY = 2000;
const SETTINGS_ID = 'settings';

interface Meta {
  userId?: string;
  /** Newest server `synced_at` seen; the next pull asks for anything after it. */
  lastPulledAt?: string;
  /** Last known edit time per entity (`table:id`), local or remote. */
  stamps: Record<string, string>;
  /** This phone's own data has been uploaded once for this account (after the first pull). */
  seeded?: boolean;
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
let flushing: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let teardown: (() => void)[] = [];
const now = () => new Date().toISOString();

const persistOutbox = () => storage.set(OUTBOX_KEY, outbox);
const persistMeta = () => storage.set(META_KEY, meta);
const report = (patch: Parameters<ReturnType<typeof useSyncStatus.getState>['set']>[0]) => useSyncStatus.getState().set({ pending: outbox.length, ...patch });

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
  flushTimer = setTimeout(() => void flush(), delay);
}

/** Send everything waiting. Safe to call any time; concurrent calls share one run. */
export function flush(): Promise<void> {
  if (!userId) return Promise.resolve();
  flushing ??= (async () => {
    const batch = [...outbox];
    if (!batch.length) return;
    report({ phase: 'syncing' });
    try {
      const tables = [...new Set(batch.map((c) => c.table))];
      for (const table of tables) {
        const changes = batch.filter((c) => c.table === table);
        const rows = changes.map((c) =>
          table === 'user_settings'
            ? { owner: userId, data: c.data ?? {}, updated_at: c.updatedAt }
            : { owner: userId, id: c.id, data: c.data ?? {}, updated_at: c.updatedAt, deleted_at: c.data === null ? c.updatedAt : null, ...(table === 'rounds' ? { status: c.status ?? 'complete' } : {}) },
        );
        const { error } = await supabase().from(table).upsert(rows, { onConflict: table === 'user_settings' ? 'owner' : 'owner,id' });
        if (error) throw new Error(error.message);
        // Drop exactly what was sent; anything edited again meanwhile stays queued.
        const sent = new Set(changes.map((c) => `${stampKey(c.table, c.id)}@${c.updatedAt}`));
        outbox = outbox.filter((c) => !sent.has(`${stampKey(c.table, c.id)}@${c.updatedAt}`));
        await persistOutbox();
      }
      report({ phase: 'idle', lastSyncedAt: now(), error: undefined });
    } catch (e) {
      const offline = !(await NetInfo.fetch().catch(() => ({ isConnected: true }))).isConnected;
      report({ phase: offline ? 'offline' : 'error', error: e instanceof Error ? e.message : String(e) });
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Bring in whatever other devices changed since the last pull. */
export async function pull(): Promise<void> {
  if (!userId) return;
  report({ phase: 'syncing' });
  try {
    let newest = meta.lastPulledAt;
    for (const spec of TABLES) {
      const columns = spec.table === 'user_settings' ? 'data, updated_at, synced_at' : `id, data, updated_at, deleted_at, synced_at${spec.table === 'rounds' ? ', status' : ''}`;
      let query = supabase().from(spec.table).select(columns).order('synced_at', { ascending: true });
      if (meta.lastPulledAt) query = query.gt('synced_at', meta.lastPulledAt);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = ((data ?? []) as unknown as Partial<RemoteRow>[]).map((r) => ({ id: r.id ?? SETTINGS_ID, data: r.data, status: r.status, updated_at: r.updated_at!, deleted_at: r.deleted_at ?? null, synced_at: r.synced_at! }));
      newest = latestSyncedAt(rows, newest);
      const winners = rows.filter((r) => remoteWins(r, meta.stamps[stampKey(spec.table, r.id)], outbox.find((c) => c.table === spec.table && c.id === r.id)));
      if (!winners.length) continue;
      const next = applyRemote(snapshots[spec.table] ?? spec.snapshot(), winners);
      applying = true;
      try {
        spec.apply(next);
      } finally {
        applying = false;
      }
      snapshots[spec.table] = spec.snapshot();
      for (const r of winners) meta.stamps[stampKey(spec.table, r.id)] = r.updated_at;
    }
    meta.lastPulledAt = newest;
    await persistMeta();
    report({ phase: 'idle', lastSyncedAt: now(), error: undefined });
  } catch (e) {
    report({ phase: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

let starting: Promise<void> = Promise.resolve();

/** Resolves once the current account's first pull and upload are done (or failed: the app then works offline). */
export function whenSyncStarted(): Promise<void> {
  return starting;
}

/** Start syncing for a signed-in account: pull, upload this phone's data once, then keep both directions going. */
export function startSync(forUser: string): Promise<void> {
  starting = run(forUser).catch(() => undefined);
  return starting;
}

async function run(forUser: string): Promise<void> {
  stopSync();
  userId = forUser;
  meta = (await storage.get<Meta>(META_KEY)) ?? { stamps: {} };
  outbox = (await storage.get<OutboxChange[]>(OUTBOX_KEY)) ?? [];
  if (meta.userId !== forUser) {
    // A different account than last time on this phone: start its bookkeeping fresh.
    meta = { userId: forUser, stamps: {} };
    outbox = [];
  }
  for (const spec of TABLES) snapshots[spec.table] = spec.snapshot();
  // Pull first: on a new phone the account's data (and its settings) must win over this phone's blank defaults.
  await pull();
  if (!meta.seeded) {
    // Then upload whatever this phone had that the account did not.
    const at = now();
    const missing: OutboxChange[] = [];
    for (const spec of TABLES) {
      snapshots[spec.table] = spec.snapshot();
      for (const [id, item] of Object.entries(snapshots[spec.table] ?? {})) if (!meta.stamps[stampKey(spec.table, id)]) missing.push({ table: spec.table, id, data: item.data, status: item.status, updatedAt: at });
    }
    meta.seeded = true;
    enqueue(missing);
    await persistMeta();
  }
  await flush();

  for (const spec of TABLES) teardown.push(spec.subscribe(() => onLocalChange(spec)));
  const app: NativeEventSubscription = AppState.addEventListener('change', (s) => {
    if (s === 'active') void pull().then(flush);
  });
  teardown.push(() => app.remove());
  teardown.push(
    NetInfo.addEventListener((s) => {
      if (s.isConnected && outbox.length) void flush();
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

/** Forget this phone's sync bookkeeping (sign-out, account deletion). */
export async function resetSync(): Promise<void> {
  stopSync();
  meta = { stamps: {} };
  outbox = [];
  await Promise.all([storage.remove(OUTBOX_KEY), storage.remove(META_KEY)]);
  useSyncStatus.getState().set({ phase: 'idle', pending: 0, lastSyncedAt: undefined, error: undefined });
}

/** Changes waiting to go up (tests and the Account status line). */
export function pendingChanges(): number {
  return outbox.length;
}
