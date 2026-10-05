import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS, saveMyName, useCourseStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore } from '@/store';
import { cedarRidge, cody, marcus } from '@/lib/__fixtures__/cedarRidge';
import { setSupabaseForTests } from './supabase';
import { flush, pendingChanges, pull, resetSync, startSync, stopSync } from './sync';

/**
 * In-memory stand-in for the Supabase tables: upsert by (owner, id), select "synced since", server-stamped synced_at.
 * `offline` makes every call fail, like no signal on the course.
 */
class FakeServer {
  tables: Record<string, Map<string, Record<string, unknown>>> = {};
  clock = 0;
  offline = false;
  owner = 'user-1';

  client(): SupabaseClient {
    const server = this;
    return {
      from(table: string) {
        const rows = (server.tables[table] ??= new Map());
        return {
          async upsert(input: Record<string, unknown>[]) {
            if (server.offline) return { error: { message: 'Network request failed' } };
            for (const r of input) {
              const key = `${r.owner}:${r.id ?? 'settings'}`;
              rows.set(key, { ...r, synced_at: new Date(Date.UTC(2026, 9, 5, 12, 0, ++server.clock)).toISOString() });
            }
            return { error: null };
          },
          select() {
            let since: string | undefined;
            const q = {
              order: () => q,
              gt: (_col: string, v: string) => ((since = v), q),
              then(resolve: (r: { data: unknown[] | null; error: { message: string } | null }) => void) {
                if (server.offline) return resolve({ data: null, error: { message: 'Network request failed' } });
                const data = [...rows.values()].filter((r) => r.owner === server.owner && (!since || (r.synced_at as string) > since)).sort((a, b) => String(a.synced_at).localeCompare(String(b.synced_at)));
                resolve({ data, error: null });
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
}

let server: FakeServer;

/** A fresh phone: empty stores and storage (the server keeps its data). */
async function newPhone() {
  stopSync();
  await AsyncStorage.clear();
  useProfileStore.setState({ profiles: [], groups: [] });
  useHistoryStore.setState({ entries: [] });
  useCourseStore.setState({ userCourses: [] });
  useRoundStore.setState({ round: null, undo: [], draft: { course: null, teeBoxId: null, players: [], settings: { ...DEFAULT_SETTINGS } } });
  usePreferences.setState({ ...DEFAULT_PREFERENCES, meProfileId: undefined, homeArea: undefined, bag: undefined, hydrated: true });
}

function startRound() {
  const s = useRoundStore.getState();
  s.setDraftCourse(cedarRidge, 'blue');
  s.setDraftPlayers([cody, marcus]);
  return useRoundStore.getState().startRound([])!;
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

  it('a different account on the same phone starts its own bookkeeping', async () => {
    useProfileStore.getState().addProfile('Shared phone');
    await startSync('user-1');
    expect(pendingChanges()).toBe(0);
    server.owner = 'user-2';
    await startSync('user-2');
    // user-2 is new on this phone, so this phone's data is uploaded once for them too.
    expect([...server.tables.people!.values()].filter((r) => r.owner === 'user-2')).toHaveLength(1);
  });
});
