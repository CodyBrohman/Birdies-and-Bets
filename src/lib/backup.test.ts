import { buildBackup, describeBackup, parseBackup } from './backup';

describe('backup file', () => {
  const good = buildBackup(2, { 'bb:rounds:history': [{ summary: { id: 'a' } }], 'bb:courses:user': [], 'bb:theme:preference': 'dark' }, '2026-09-22T10:00:00Z');

  it('round-trips through JSON', () => {
    const parsed = parseBackup(JSON.stringify(good));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.file).toEqual(good);
  });

  it('rejects things that are not backups', () => {
    expect(parseBackup('nope').ok).toBe(false);
    expect(parseBackup('[]').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'other', schema: 1, exportedAt: 'x', data: {} })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...good, schema: 'two' })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...good, data: [] })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...good, data: { evil: 1 } })).ok).toBe(false);
    const r = parseBackup(JSON.stringify({ ...good, data: { 'bb:x': 42 } }));
    expect(r.ok).toBe(false);
  });

  it('describes itself for the confirm sheet', () => {
    expect(describeBackup(good, () => 'Sep 22')).toBe('1 round, 0 courses · exported Sep 22');
    expect(describeBackup(buildBackup(2, { 'bb:round:active': { id: 'r' }, 'bb:courses:user': [{}, {}] }), () => 'Sep 22')).toBe('0 rounds, 2 courses, a round in progress · exported Sep 22');
  });
});
