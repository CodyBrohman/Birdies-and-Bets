import { applyRemote, backoffMs, chunkByBytes, classifySyncError, coalesceOutbox, diffSnapshots, latestSyncedAt, pruneOutbox, pullSince, remoteWins, stableJson, type OutboxChange, type RemoteRow } from './sync';

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

  it('skips untouched entities by reference, so one score tap does not re-serialise all history', () => {
    let reads = 0;
    const untouched = {
      get holes() {
        reads++;
        return [1, 2, 3];
      },
    };
    const prev = { a: { data: untouched, status: 'complete' as const }, b: { data: { n: 1 } } };
    // Snapshots rebuild their wrappers every time; the entity object itself is what stays the same.
    const next = { a: { data: untouched, status: 'complete' as const }, b: { data: { n: 2 } } };
    expect(diffSnapshots(prev, next)).toEqual({ upserts: ['b'], deletes: [] });
    expect(reads).toBe(0);
    // A changed status still counts, even with the same object.
    expect(diffSnapshots(prev, { a: { data: untouched, status: 'in-progress' as never }, b: next.b }).upserts).toEqual(['a', 'b']);
  });

  it('re-reads a few minutes back on every pull, to catch writes that committed late', () => {
    expect(pullSince(undefined)).toBeUndefined();
    expect(pullSince('2026-10-05T12:10:00.000Z')).toBe('2026-10-05T12:05:00.000Z');
    expect(pullSince('not a date')).toBeUndefined();
  });

  it('sorts write errors into retry, sign-in and set-aside', () => {
    expect(classifySyncError({ message: 'Network request failed' })).toBe('transient');
    expect(classifySyncError({ message: 'Bad gateway', status: 502 })).toBe('transient');
    expect(classifySyncError({ message: 'Too many requests', status: 429 })).toBe('transient');
    expect(classifySyncError({ message: 'JWT expired', code: 'PGRST301', status: 401 })).toBe('auth');
    expect(classifySyncError({ message: 'new row violates row-level security policy', code: '42501', status: 403 })).toBe('auth');
    expect(classifySyncError({ message: 'value too long', code: '22001', status: 400 })).toBe('row');
    expect(classifySyncError({ message: 'violates check constraint', code: '23514', status: 400 })).toBe('row');
    expect(classifySyncError({ message: 'Payload too large', status: 413 })).toBe('row');
    expect(classifySyncError(null)).toBe('transient');
  });

  it('backs off from 2 s, doubling to a 5 minute cap, with a little jitter', () => {
    expect(backoffMs(0, () => 0)).toBe(2000);
    expect(backoffMs(3, () => 0)).toBe(16000);
    expect(backoffMs(20, () => 0)).toBe(300000);
    expect(backoffMs(0, () => 1)).toBe(2400);
  });

  it('splits a big first upload into request-sized batches without losing or reordering rows', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: String(i), pad: 'x'.repeat(100) }));
    const batches = chunkByBytes(rows, 350);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flat()).toEqual(rows);
    expect(chunkByBytes([], 10)).toEqual([]);
    // One row bigger than the limit still goes, alone.
    expect(chunkByBytes([{ big: 'y'.repeat(500) }], 100)).toHaveLength(1);
  });

  it('drops queued edits that a newer (or equal) remote row already replaced', () => {
    const c = (table: OutboxChange['table'], id: string, at: string): OutboxChange => ({ table, id, data: {}, updatedAt: at });
    const out = [c('people', 'a', '2026-10-05T10:00:00Z'), c('people', 'b', '2026-10-05T10:10:00Z'), c('courses', 'a', '2026-10-05T09:00:00Z')];
    const pruned = pruneOutbox(out, 'people', [
      { id: 'a', updated_at: '2026-10-05T10:05:00Z' },
      { id: 'b', updated_at: '2026-10-05T10:01:00Z' },
    ]);
    expect(pruned.map((x) => `${x.table}:${x.id}`)).toEqual(['people:b', 'courses:a']);
  });
});
