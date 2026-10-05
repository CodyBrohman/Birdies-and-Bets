import { applyRemote, coalesceOutbox, diffSnapshots, latestSyncedAt, remoteWins, stableJson, type OutboxChange, type RemoteRow } from './sync';

const row = (id: string, updated_at: string, extra: Partial<RemoteRow> = {}): RemoteRow => ({ id, data: { id, v: updated_at }, updated_at, deleted_at: null, synced_at: updated_at, ...extra });

describe('sync merge', () => {
  it('compares entities regardless of key order and ignores undefined fields', () => {
    expect(stableJson({ a: 1, b: { c: 2, d: [1, 2] } })).toBe(stableJson({ b: { d: [1, 2], c: 2 }, a: 1, z: undefined }));
    expect(stableJson({ a: 1 })).not.toBe(stableJson({ a: 2 }));
  });

  it('finds new, edited and removed entities', () => {
    const prev = { a: { data: { n: 1 } }, b: { data: { n: 2 } }, c: { data: { n: 3 } } };
    const next = { a: { data: { n: 1 } }, b: { data: { n: 20 } }, d: { data: { n: 4 } } };
    expect(diffSnapshots(prev, next)).toEqual({ upserts: ['b', 'd'], deletes: ['c'] });
  });

  it('a status change alone counts as an edit (a round finishing)', () => {
    const data = { id: 'r1' };
    expect(diffSnapshots({ r1: { data, status: 'in-progress' } }, { r1: { data, status: 'complete' } }).upserts).toEqual(['r1']);
  });

  it('keeps one change per entity in the outbox, the newest', () => {
    const c = (id: string, at: string, data: unknown = { at }): OutboxChange => ({ table: 'people', id, data, updatedAt: at });
    const out = coalesceOutbox([c('a', '2026-10-05T10:00:00Z'), c('b', '2026-10-05T10:01:00Z')], [c('a', '2026-10-05T10:02:00Z', null)]);
    expect(out.map((x) => [x.id, x.data])).toEqual([
      ['b', { at: '2026-10-05T10:01:00Z' }],
      ['a', null],
    ]);
    // An older change arriving late never replaces a newer one.
    expect(coalesceOutbox(out, [c('a', '2026-10-05T09:00:00Z')]).find((x) => x.id === 'a')!.data).toBeNull();
  });

  it('a remote row wins only when it is newer than our last edit or pending change', () => {
    const r = row('a', '2026-10-05T10:05:00Z');
    expect(remoteWins(r, undefined, undefined)).toBe(true);
    expect(remoteWins(r, '2026-10-05T10:00:00Z', undefined)).toBe(true);
    expect(remoteWins(r, '2026-10-05T10:05:00Z', undefined)).toBe(false); // tie keeps local (and our own echo)
    expect(remoteWins(r, '2026-10-05T10:00:00Z', { table: 'people', id: 'a', data: {}, updatedAt: '2026-10-05T10:06:00Z' })).toBe(false);
  });

  it('applies upserts and tombstones', () => {
    const snap = { a: { data: 1 }, b: { data: 2 } };
    const next = applyRemote(snap, [row('a', 't2', { deleted_at: 't2' }), row('c', 't2', { status: 'complete' })]);
    expect(Object.keys(next).sort()).toEqual(['b', 'c']);
    expect(next.c!.status).toBe('complete');
    expect(snap).toEqual({ a: { data: 1 }, b: { data: 2 } }); // input untouched
  });

  it('tracks the newest server time for the next pull', () => {
    expect(latestSyncedAt([], undefined)).toBeUndefined();
    expect(latestSyncedAt([{ synced_at: '2026-10-05T10:00:00Z' }, { synced_at: '2026-10-05T11:00:00Z' }], '2026-10-05T09:00:00Z')).toBe('2026-10-05T11:00:00Z');
    expect(latestSyncedAt([{ synced_at: '2026-10-05T08:00:00Z' }], '2026-10-05T09:00:00Z')).toBe('2026-10-05T09:00:00Z');
  });
});
