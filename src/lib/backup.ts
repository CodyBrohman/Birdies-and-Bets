// Backup file format. Pure: parsing and validation only; reading and writing storage lives in store/backup.

export const BACKUP_APP = 'birdies-and-bets';

export interface BackupFile {
  app: typeof BACKUP_APP;
  /** Schema version of the data inside. */
  schema: number;
  exportedAt: string; // ISO
  /** Storage key → value, for every persisted key except the schema stamp. */
  data: Record<string, unknown>;
}

export type ParsedBackup = { ok: true; file: BackupFile } | { ok: false; reason: string };

export function buildBackup(schema: number, data: Record<string, unknown>, exportedAt = new Date().toISOString()): BackupFile {
  return { app: BACKUP_APP, schema, exportedAt, data };
}

/** Parse and validate a backup file's JSON text. Never throws. */
export function parseBackup(json: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'That file is not valid JSON.' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'That file is not a Birdies & Bets backup.' };
  const b = raw as Partial<BackupFile>;
  if (b.app !== BACKUP_APP) return { ok: false, reason: 'That file is not a Birdies & Bets backup.' };
  if (typeof b.schema !== 'number' || !Number.isInteger(b.schema) || b.schema < 1) return { ok: false, reason: 'The backup has no valid schema version.' };
  if (typeof b.exportedAt !== 'string') return { ok: false, reason: 'The backup has no export date.' };
  if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return { ok: false, reason: 'The backup contains no data.' };
  for (const [key, value] of Object.entries(b.data)) {
    if (!key.startsWith('bb:')) return { ok: false, reason: `Unexpected key in backup: ${key}` };
    if (value !== null && typeof value !== 'object' && typeof value !== 'string') return { ok: false, reason: `Unexpected value for ${key}` };
  }
  return { ok: true, file: { app: BACKUP_APP, schema: b.schema, exportedAt: b.exportedAt, data: b.data as Record<string, unknown> } };
}

/** A one-line description for the confirm sheet: "3 rounds, 2 courses, exported Sep 22". */
export function describeBackup(file: BackupFile, formatDate: (iso: string) => string): string {
  const rounds = Array.isArray(file.data['bb:rounds:history']) ? (file.data['bb:rounds:history'] as unknown[]).length : 0;
  const courses = Array.isArray(file.data['bb:courses:user']) ? (file.data['bb:courses:user'] as unknown[]).length : 0;
  const active = file.data['bb:round:active'] ? ', a round in progress' : '';
  return `${rounds} round${rounds === 1 ? '' : 's'}, ${courses} course${courses === 1 ? '' : 's'}${active} · exported ${formatDate(file.exportedAt)}`;
}
