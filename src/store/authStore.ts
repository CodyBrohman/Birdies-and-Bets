import { create } from 'zustand';

/**
 * - 'disabled': no backend configured (local-only dev builds and tests). No account UI at all.
 * - 'signed-out': a backend exists and the person has not chosen yet: the welcome screen (sign in, or carry on without).
 * - 'local': they chose "Continue without an account". Everything works on this phone; sign-in stays on offer.
 * - 'signed-in': an account, synced. Stays signed in offline and with an expired token; see `sessionExpired`.
 */
export type AuthStatus = 'loading' | 'disabled' | 'signed-out' | 'local' | 'signed-in';
export type SignInMethod = 'apple' | 'email';

export interface AccountUser {
  userId: string;
  email?: string;
  method?: SignInMethod;
}

/** Session facts the screens need. Written only by services/auth; nothing secret lives here. */
interface AuthState {
  status: AuthStatus;
  userId?: string;
  email?: string;
  method?: SignInMethod;
  /** Signed in, but the server no longer accepts the session (revoked, or the refresh token expired for good). The data
   *  stays on the phone and sync waits until the person signs in again. */
  sessionExpired: boolean;
  /** Someone signed in to a different account on a phone holding another account's data: the sign-in screen asks
   *  whether to replace it before anything is uploaded. */
  pendingSwitch?: AccountUser;
  setSignedIn(user: AccountUser): void;
  setSignedOut(): void;
  setLocal(): void;
  setStatus(status: AuthStatus): void;
  setSessionExpired(expired: boolean): void;
  setPendingSwitch(user: AccountUser | undefined): void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  sessionExpired: false,
  setSignedIn: ({ userId, email, method }) => set({ status: 'signed-in', userId, email, method, sessionExpired: false }),
  setSignedOut: () => set({ status: 'signed-out', userId: undefined, email: undefined, method: undefined, sessionExpired: false, pendingSwitch: undefined }),
  setLocal: () => set({ status: 'local', userId: undefined, email: undefined, method: undefined, sessionExpired: false }),
  setStatus: (status) => set({ status }),
  setSessionExpired: (sessionExpired) => set({ sessionExpired }),
  setPendingSwitch: (pendingSwitch) => set({ pendingSwitch }),
}));

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

/** What the Account section shows: "Synced just now" / "Offline: 3 changes waiting" / "1 item couldn't sync". */
interface SyncStatusState {
  phase: SyncPhase;
  pending: number;
  /** Changes the server refused as they are, set aside so they stop blocking the queue. */
  rejected: number;
  /** Sync stopped because the session is no longer valid; it resumes after signing in again. */
  authPaused: boolean;
  lastSyncedAt?: string;
  error?: string;
  set(patch: Partial<Omit<SyncStatusState, 'set'>>): void;
}

export const useSyncStatus = create<SyncStatusState>()((set) => ({
  phase: 'idle',
  pending: 0,
  rejected: 0,
  authPaused: false,
  set: (patch) => set(patch),
}));
