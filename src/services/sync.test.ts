import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS, saveMyName, useCourseStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore, useSyncStatus } from '@/store';
import { cedarRidge, cody, marcus } from '@/lib/__fixtures__/cedarRidge';
import type { HistoryEntry, PlayerProfile } from '@/types';
import { setSupabaseForTests } from './supabase';
import { flush, lastSyncedAccount, pendingChanges, pull, resetSync, restoreWithSync, resumeSync, retryRejected, startSync, stopSync } from './sync';

/**
 * In-memory stand-in for the Supabase tables: upsert by (owner, id), select "synced since", server-stamped synced_at,
 * and the same rule as the real `keep_newest` trigger (an older edit never replaces a newer row).
 * `offline` fails every call like no signal; `authError` answers like an expired session; `rejectIds` refuses any batch
 * containing those ids with a constraint error, like data the server will never accept.
 */
class FakeServer {
  tables: Record<string, Map<string, Record<string, unknown>>> = {};
  clock = 0;
  offline = false;
  authError = false;
  rejectIds = new Set<string>();
  owner = 'user-1';

  stamp() {
    return new Date(Date.UTC(2026, 9, 5, 12, 0, ++this.clock)).toISOString();
  }

  client(): SupabaseClient {
    const server = this;
    return {
      from(table: string) {
        const rows = (server.tables[table] ??= new Map());
        return {
          async upsert(input: Record<string, unknown>[]) {
            if (server.offline) return { error: { message: 'Network request failed' }, status: 0 };
            if (server.authError) return { error: { message: 'JWT expired', code: 'PGRST301' }, status: 401 };
            if (input.some((r) => server.rejectIds.has(String(r.id)))) return { error: { message: 'new row violates check constraint', code: '23514' }, status: 400 };
            for (const r of input) {
              const key = `${r.owner}:${r.id ?? 'settings'}`;
              const existing = rows.get(key);
              if (existing && String(existing.updated_at) > String(r.updated_at)) continue; // keep_newest
              rows.set(key, { ...r, synced_at: server.stamp() });
            }
            return { error: null, status: 201 };
          },
          select() {
            let since: string | undefined;
            const q = {
              order: () => q,
              gt: (_col: string, v: string) => ((since = v), q),
              then(resolve: (r: { data: unknown[] | null; error: { message: string; code?: string } | null; status: number }) => void) {
                if (server.offline) return resolve({ data: null, error: { message: 'Network request failed' }, status: 0 });
                if (server.authError) return resolve({ data: null, error: { message: 'JWT expired', code: 'PGRST301' }, status: 401 });
                const data = [...rows.values()].filter((r) => r.owner === server.owner && (!since || (r.synced_at as string) > since)).sort((a, b) => String(a.synced_at).localeCompare(String(b.synced_at)));
                resolve({ data, error: null, status: 200 });
              },
            };
            return q;
          },
        };
      },
    } as unknown as SupabaseClient;
  }

  row(table: string, id: string) {
    return this.tables[table]?.get(`${this.owner}:${id}`);
  }

  rows(table: string) {
    return [...(this.tables[table]?.values() ?? [])].filter((r) => r.owner === this.owner);
  }

  /** Write a row as another phone (or an earlier session) would have. */
  put(table: string, id: string, data: unknown, extra: Record<string, unknown> = {}) {
    (this.tables[table] ??= new Map()).set(`${this.owner}:${id}`, { owner: this.owner, id, data, updated_at: '2026-10-01T00:00:00.000Z', deleted_at: null, synced_at: this.stamp(), ...extra });
  }
}

let server: FakeServer;

/** A fresh phone: empty stores and storage (the server keeps its data). */
async function newPhone() {
  stopSync();
  await AsyncStorage.clear();
  useProfileStore.setState({ profiles: [], groups: [] });
  useHistoryStore.setState({ entries: [] });
  useCourseStore.setState({ userCourses: [] });
  useRoundStore.setState({ round: null, undo: [], draft: { course: null, teeBoxId: null, players: [], settings: { ...DEFAULT_SETTINGS }, games: [] } });
  usePreferences.setState({ ...DEFAULT_PREFERENCES, meProfileId: undefined, homeArea: undefined, bag: undefined, hydrated: true });
}

function startRound() {
  const s = useRoundStore.getState();
  s.setDraftCourse(cedarRidge, 'blue');
  s.setDraftPlayers([cody, marcus]);
  return useRoundStore.getState().startRound([])!;
}

const historyEntry = (id: string, completedAt = '2026-10-01T18:00:00.000Z'): HistoryEntry => ({ summary: { id, completedAt, courseName: 'Cedar Ridge', holeCount: 18, players: [], leaderId: '', gameNames: [], resultLabel: '' } });

/** Wait for background sync work (a resumed flush, a scheduled retry) to settle. */
async function until(check: () => boolean, ms = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 10));
  }
}

beforeEach(async () => {
  jest.useRealTimers();
  server = new FakeServer();
  setSupabaseForTests(server.client());
  await newPhone();
  await resetSync();
});

afterAll(() => {
  stopSync();
  setSupabaseForTests(null);
});

describe('cloud sync', () => {
  it('first sign-in uploads what is already on the phone', async () => {
    const meId = saveMyName('Cody')!;
    usePreferences.getState().update({ defaultStakeLabel: '$', homeArea: 'Maple, ON' });
    const round = startRound();
    await startSync('user-1');
    expect(pendingChanges()).toBe(0);
    expect((server.row('people', meId)!.data as { name: string }).name).toBe('Cody');
    expect(server.row('rounds', round.id)).toMatchObject({ status: 'in-progress', deleted_at: null });
    expect(server.row('user_settings', 'settings')!.data).toMatchObject({ defaultStakeLabel: '$', homeArea: 'Maple, ON', meProfileId: meId });
  });

  it('a second phone gets the account back, and keeps its own "me" from the account', async () => {
    const meId = saveMyName('Cody')!;
    usePreferences.getState().update({ defaultStakeLabel: '$' });
    const round = startRound();
    await startSync('user-1');

    await newPhone();
    await resetSync();
    await startSync('user-1');
    expect(useProfileStore.getState().profiles.map((p) => p.name)).toContain('Cody');
    expect(usePreferences.getState()).toMatchObject({ meProfileId: meId, defaultStakeLabel: '$' });
    expect(useRoundStore.getState().round?.id).toBe(round.id);
    expect(pendingChanges()).toBe(0);
  });

  it('starting offline uploads nothing until a pull gets through, then catches up', async () => {
    saveMyName('Cody');
    server.offline = true;
    await startSync('user-1');
    expect(server.rows('people')).toHaveLength(0);
    // Signal back (the next launch, foreground or reconnect runs the same pull-then-upload).
    server.offline = false;
    await startSync('user-1');
    expect(server.rows('people')).toHaveLength(1);
  });

  it('edits queue while offline and go up when signal returns', async () => {
    await startSync('user-1');
    server.offline = true;
    const profile = useProfileStore.getState().addProfile('Priya', 21.4);
    expect(pendingChanges()).toBe(1);
    await flush();
    expect(pendingChanges()).toBe(1);
    expect(JSON.parse((await AsyncStorage.getItem('bb:sync:outbox'))!)).toHaveLength(1); // survives a restart
    server.offline = false;
    await flush();
    expect(pendingChanges()).toBe(0);
    expect(server.row('people', profile.id)).toBeTruthy();
  });

  it('a newer edit from another phone wins; our own newer pending edit is never overwritten', async () => {
    const p = useProfileStore.getState().addProfile('Marcus', 13.6);
    await startSync('user-1');
    // Another phone renames him (edited later than our upload).
    server.tables.people!.set(`user-1:${p.id}`, { ...server.row('people', p.id)!, data: { ...p, name: 'Marcus B' }, updated_at: '2999-01-01T00:00:00.000Z', synced_at: '2026-10-05T13:00:00.000Z' });
    await pull();
    expect(useProfileStore.getState().profiles.find((x) => x.id === p.id)!.name).toBe('Marcus B');

    // Now we edit offline; an older remote copy arriving must not undo it.
    server.offline = true;
    useProfileStore.getState().updateProfile(p.id, { name: 'Marc' });
    server.offline = false;
    server.tables.people!.set(`user-1:${p.id}`, { ...server.row('people', p.id)!, data: { ...p, name: 'Old name' }, updated_at: '2026-01-01T00:00:00.000Z', synced_at: '2026-10-05T14:00:00.000Z' });
    await pull();
    expect(useProfileStore.getState().profiles.find((x) => x.id === p.id)!.name).toBe('Marc');
  });

  it('a stale offline edit loses to a newer one already on the server, and this phone catches up', async () => {
    const p = useProfileStore.getState().addProfile('Marcus', 13.6);
    await startSync('user-1');
    server.offline = true;
    useProfileStore.getState().updateProfile(p.id, { name: 'Marc (offline)' });
    // Meanwhile another phone renamed him, later than our offline edit.
    server.tables.people!.set(`user-1:${p.id}`, { ...server.row('people', p.id)!, data: { ...p, name: 'Marcus Brown' }, updated_at: '2999-01-01T00:00:00.000Z', synced_at: server.stamp() });
    server.offline = false;
    await flush(); // the server keeps the newer row
    expect((server.row('people', p.id)!.data as PlayerProfile).name).toBe('Marcus Brown');
    await pull();
    expect(useProfileStore.getState().profiles.find((x) => x.id === p.id)!.name).toBe('Marcus Brown');
    expect(pendingChanges()).toBe(0);
  });

  it('a delete travels as a tombstone and removes it on the other phone', async () => {
    const p = useProfileStore.getState().addProfile('Dee');
    await startSync('user-1');
    useProfileStore.getState().removeProfile(p.id);
    await flush();
    expect(server.row('people', p.id)!.deleted_at).toBeTruthy();

    await newPhone();
    useProfileStore.setState({ profiles: [{ ...p }] });
    await resetSync();
    await startSync('user-1');
    expect(useProfileStore.getState().profiles.find((x) => x.id === p.id)).toBeUndefined();
  });

  it('keeps every round: 60 and more finished rounds are never deleted from the account', async () => {
    useHistoryStore.setState({ entries: Array.from({ length: 60 }, (_, i) => historyEntry(`r${i}`)) });
    await startSync('user-1');
    expect(server.rows('rounds')).toHaveLength(60);
    useHistoryStore.getState().add(historyEntry('r60', '2026-10-02T18:00:00.000Z'));
    await flush();
    expect(server.rows('rounds')).toHaveLength(61);
    expect(server.rows('rounds').filter((r) => r.deleted_at)).toHaveLength(0);
  });

  it('finishing a round on one phone moves it to history on the other', async () => {
    const round = startRound();
    await startSync('user-1');
    await newPhone();
    await resetSync();
    await startSync('user-1');
    expect(useRoundStore.getState().round?.id).toBe(round.id);

    // The first phone finishes it: the same row becomes a history entry.
    const entry = { summary: { id: round.id, completedAt: '2026-10-05T18:00:00.000Z', courseName: 'Cedar Ridge', players: [], leaderId: '', gameNames: [] }, round: { ...round, status: 'complete' } };
    server.tables.rounds!.set(`user-1:${round.id}`, { owner: 'user-1', id: round.id, status: 'complete', data: entry, updated_at: '2999-01-01T00:00:00.000Z', deleted_at: null, synced_at: '2026-10-05T19:00:00.000Z' });
    await pull();
    expect(useRoundStore.getState().round).toBeNull();
    expect(useHistoryStore.getState().entries.map((e) => e.summary.id)).toEqual([round.id]);
  });

  it('a row the server refuses is set aside; everything else still syncs, and it can be retried', async () => {
    await startSync('user-1');
    const a = useProfileStore.getState().addProfile('Ann');
    const b = useProfileStore.getState().addProfile('Bad row');
    const c = useProfileStore.getState().addProfile('Cal');
    server.rejectIds.add(b.id);
    await flush();
    expect(server.row('people', a.id)).toBeTruthy();
    expect(server.row('people', c.id)).toBeTruthy();
    expect(server.row('people', b.id)).toBeUndefined();
    expect(pendingChanges()).toBe(0);
    expect(useSyncStatus.getState().rejected).toBe(1);

    server.rejectIds.clear();
    await retryRejected();
    expect(server.row('people', b.id)).toBeTruthy();
    expect(useSyncStatus.getState().rejected).toBe(0);
  });

  it('an expired session pauses sync with the changes kept, and signing in again resumes it', async () => {
    await startSync('user-1');
    server.authError = true;
    const p = useProfileStore.getState().addProfile('Priya');
    await flush();
    expect(useSyncStatus.getState().authPaused).toBe(true);
    expect(pendingChanges()).toBe(1);
    server.authError = false;
    await flush(); // still paused: nothing is sent until the session is back
    expect(server.row('people', p.id)).toBeUndefined();
    resumeSync();
    await until(() => pendingChanges() === 0);
    expect(server.row('people', p.id)).toBeTruthy();
    expect(useSyncStatus.getState().authPaused).toBe(false);
  });

  it("never uploads another account's data from this phone", async () => {
    useProfileStore.getState().addProfile('Shared phone');
    await startSync('user-1');
    expect(await lastSyncedAccount()).toBe('user-1');
    server.owner = 'user-2';
    await startSync('user-2');
    expect(server.rows('people')).toHaveLength(0);
    expect(useSyncStatus.getState().error).toMatch(/another account/);
    // Once the phone is reset for the new account (services/auth does this after asking), it syncs normally.
    await resetSync();
    await startSync('user-2');
    expect(server.rows('people')).toHaveLength(1);
  });

  it('restoring a backup while signed in merges it with the account and deletes nothing', async () => {
    server.put('rounds', 'r1', historyEntry('r1'), { status: 'complete' });
    server.put('rounds', 'r2', historyEntry('r2'), { status: 'complete', deleted_at: '2026-10-02T00:00:00.000Z', updated_at: '2026-10-02T00:00:00.000Z' });
    await startSync('user-1');
    expect(useHistoryStore.getState().entries.map((e) => e.summary.id)).toEqual(['r1']);

    // The backup has r2 (deleted from the account since) and r3 (never synced), but not r1.
    await restoreWithSync(async () => {
      useHistoryStore.setState({ entries: [historyEntry('r2'), historyEntry('r3')] });
    });
    expect(useHistoryStore.getState().entries.map((e) => e.summary.id).sort()).toEqual(['r1', 'r2', 'r3']);
    expect(server.row('rounds', 'r1')!.deleted_at).toBeNull();
    expect(server.row('rounds', 'r2')!.deleted_at).toBeNull(); // brought back
    expect(server.row('rounds', 'r3')).toBeTruthy();
  });

  it('signing in on a phone that already had its own "me" merges it into the account\'s, without a duplicate', async () => {
    const localMe = saveMyName('Cody')!;
    const round = startRound(); // Cody's seat links to this phone's "me"
    expect(round.players.find((p) => p.name === cody.name)?.profileId).toBe(localMe);
    const accountMe: PlayerProfile = { id: 'pr_account_me', name: 'Cody', handicapIndex: 12.4, indexHistory: [{ at: '2026-09-01T00:00:00.000Z', index: 12.4 }], createdAt: '2026-09-01T00:00:00.000Z' };
    server.put('people', accountMe.id, accountMe);
    server.put('user_settings', 'settings', { meProfileId: accountMe.id });

    await startSync('user-1');
    expect(usePreferences.getState().meProfileId).toBe(accountMe.id);
    expect(useProfileStore.getState().profiles.filter((p) => p.name === 'Cody').map((p) => p.id)).toEqual([accountMe.id]);
    expect(useRoundStore.getState().round!.players.find((p) => p.name === cody.name)?.profileId).toBe(accountMe.id);
    expect(server.row('people', localMe)).toBeUndefined();
    const uploaded = server.row('rounds', round.id)!.data as { players: { name: string; profileId?: string }[] };
    expect(uploaded.players.find((p) => p.name === cody.name)?.profileId).toBe(accountMe.id);
  });
});
