import { create } from 'zustand';
import { useHapticsPreference } from '@/theme';
import { ALLOWANCE_OPTIONS, DEFAULT_ALLOWANCE } from '@/lib/handicap';
import { storage, STORAGE_KEYS } from './storage';

/** App-wide preferences. Theme lives in theme/preference (persisted by themeStore). */
export interface Preferences {
  haptics: boolean;
  /** Stake label every new round starts with. */
  defaultStakeLabel: string;
  /** Handicap allowance every new round starts with. */
  defaultAllowance: number;
  /** The first-launch tour has been seen (or skipped). */
  onboarded: boolean;
  /** The saved player profile that is the phone's owner; drives the personal stats on Home. */
  meProfileId?: string;
  /** Free-text home area shown on Courses and Profile ("Toronto, ON"). */
  homeArea?: string;
  /** Local URI of the profile photo. */
  photoUri?: string;
  /** Clubs in the bag, by id from CLUBS. Undefined = never edited (the default set). */
  bag?: string[];
}

/** The 14-club set the Profile bag picker offers, in bag order. */
export const CLUBS = [
  { id: 'driver', label: 'Driver' },
  { id: '3w', label: '3 Wood' },
  { id: '5w', label: '5 Wood' },
  { id: '3h', label: '3 Hybrid' },
  { id: '4h', label: '4 Hybrid' },
  { id: '5i', label: '5 Iron' },
  { id: '6i', label: '6 Iron' },
  { id: '7i', label: '7 Iron' },
  { id: '8i', label: '8 Iron' },
  { id: '9i', label: '9 Iron' },
  { id: 'pw', label: 'Pitching wedge' },
  { id: 'sw', label: 'Sand wedge' },
  { id: 'lw', label: 'Lob wedge' },
  { id: 'putter', label: 'Putter' },
] as const;

export const DEFAULT_BAG: string[] = ['driver', '3w', '6i', '7i', '8i', '9i', 'pw', 'sw', 'putter'];

const MAX_AREA = 40;

export const DEFAULT_PREFERENCES: Preferences = { haptics: true, defaultStakeLabel: 'points', defaultAllowance: DEFAULT_ALLOWANCE, onboarded: false };

const MAX_STAKE_LABEL = 8;

/** Accept only what the app can use; anything else falls back field by field. */
export function sanitizePreferences(v: unknown): Preferences {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const label = typeof o.defaultStakeLabel === 'string' ? o.defaultStakeLabel.trim().slice(0, MAX_STAKE_LABEL) : '';
  const allowance = typeof o.defaultAllowance === 'number' && (ALLOWANCE_OPTIONS as readonly number[]).includes(o.defaultAllowance) ? o.defaultAllowance : DEFAULT_ALLOWANCE;
  return {
    haptics: typeof o.haptics === 'boolean' ? o.haptics : DEFAULT_PREFERENCES.haptics,
    defaultStakeLabel: label || DEFAULT_PREFERENCES.defaultStakeLabel,
    defaultAllowance: allowance,
    onboarded: o.onboarded === true,
    ...(typeof o.meProfileId === 'string' && o.meProfileId ? { meProfileId: o.meProfileId } : {}),
    ...(typeof o.homeArea === 'string' && o.homeArea.trim() ? { homeArea: o.homeArea.trim().slice(0, MAX_AREA) } : {}),
    ...(typeof o.photoUri === 'string' && o.photoUri ? { photoUri: o.photoUri } : {}),
    ...(Array.isArray(o.bag) ? { bag: CLUBS.map((c) => c.id as string).filter((id) => (o.bag as unknown[]).includes(id)) } : {}),
  };
}

interface PreferencesState extends Preferences {
  hydrated: boolean;
  hydrate(): Promise<void>;
  update(patch: Partial<Preferences>): void;
  reset(): void;
}

export const usePreferences = create<PreferencesState>()((set, get) => {
  const apply = (p: Preferences) => {
    // Spread merges, so absent optional fields must be written explicitly to clear them.
    set({ ...p, meProfileId: p.meProfileId, homeArea: p.homeArea, photoUri: p.photoUri, bag: p.bag });
    useHapticsPreference.getState().setEnabled(p.haptics);
  };
  const current = (): Preferences => {
    const { haptics, defaultStakeLabel, defaultAllowance, onboarded, meProfileId, homeArea, photoUri, bag } = get();
    return { haptics, defaultStakeLabel, defaultAllowance, onboarded, ...(meProfileId ? { meProfileId } : {}), ...(homeArea ? { homeArea } : {}), ...(photoUri ? { photoUri } : {}), ...(bag ? { bag } : {}) };
  };
  return {
    ...DEFAULT_PREFERENCES,
    hydrated: false,

    async hydrate() {
      try {
        apply(sanitizePreferences(await storage.get<unknown>(STORAGE_KEYS.preferences)));
      } catch {
        apply(DEFAULT_PREFERENCES);
      }
      set({ hydrated: true });
    },

    update(patch) {
      const merged = { ...current(), ...patch };
      for (const k of ['meProfileId', 'homeArea', 'photoUri'] as const) if (k in patch && !patch[k]) delete merged[k];
      apply(sanitizePreferences(merged));
      void storage.set(STORAGE_KEYS.preferences, current());
    },

    reset() {
      apply(DEFAULT_PREFERENCES);
      void storage.remove(STORAGE_KEYS.preferences);
    },
  };
});

/** What a fresh round draft starts with, from the saved preferences. */
export function draftDefaults(): { stakeLabel: string; allowance: number } {
  const { defaultStakeLabel, defaultAllowance } = usePreferences.getState();
  return { stakeLabel: defaultStakeLabel, allowance: defaultAllowance };
}
