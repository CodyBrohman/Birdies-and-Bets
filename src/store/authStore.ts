import { create } from 'zustand';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'disabled';
export type SignInMethod = 'apple' | 'email';

/** Session facts the screens need. Written only by services/auth; nothing secret lives here. */
interface AuthState {
  /** 'disabled' = no backend configured (local-only dev builds and tests): the sign-in gate is skipped. */
  status: AuthStatus;
  userId?: string;
  email?: string;
  method?: SignInMethod;
  /** The sign-in screen is still finishing (waiting for the first sync, asking for a name): keep it open. */
  finishing: boolean;
  setFinishing(finishing: boolean): void;
  setSignedIn(user: { userId: string; email?: string; method?: SignInMethod }): void;
  setSignedOut(): void;
  setStatus(status: AuthStatus): void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  finishing: false,
  setFinishing: (finishing) => set({ finishing }),
  setSignedIn: ({ userId, email, method }) => set({ status: 'signed-in', userId, email, method }),
  setSignedOut: () => set({ status: 'signed-out', userId: undefined, email: undefined, method: undefined }),
  setStatus: (status) => set({ status }),
}));

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

/** What the Account section shows: "Synced just now" / "Offline: 3 changes waiting". */
interface SyncStatusState {
  phase: SyncPhase;
  pending: number;
  lastSyncedAt?: string;
  error?: string;
  set(patch: Partial<Omit<SyncStatusState, 'set'>>): void;
}

export const useSyncStatus = create<SyncStatusState>()((set) => ({
  phase: 'idle',
  pending: 0,
  set: (patch) => set(patch),
}));
