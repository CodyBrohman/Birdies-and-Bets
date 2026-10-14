// Accounts are optional. Sign in with Apple, or a 6-digit code by email, adds sync across phones; "Continue without an
// account" keeps everything on this phone. The choice is remembered (bb:auth), so every launch opens straight into the
// app from storage: offline, with an expired token, with no signal at all. The app signs out only when the person asks,
// or keeps the data and asks them to sign in again when the server says the session is gone for good.
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { clearAllData, saveMyName, storage, useAuthStore, useCourseStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore, type AccountUser } from '@/store';
import { backendConfigured, readStoredSessionUser, removeStoredSession, supabase } from './supabase';
import { flushWithin, lastSyncedAccount, resetSync, resumeSync, startSync, whenSyncStarted } from './sync';

/** What the person chose on this phone. Owned by this service, like bb:sync:*; not part of backups. */
const AUTH_KEY = 'bb:auth';
type AuthSnapshot = { mode: 'local' } | ({ mode: 'account' } & AccountUser);

let started = false;
/** Set while this app itself signs out, so the SIGNED_OUT event it causes is not read as the server ending the session. */
let signingOut = false;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error('timeout')), ms)));
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

const saveSnapshot = (s: AuthSnapshot | null) => (s ? storage.set(AUTH_KEY, s) : storage.remove(AUTH_KEY));

function userOf(session: Session): AccountUser {
  return { userId: session.user.id, email: session.user.email ?? undefined, method: session.user.app_metadata?.provider === 'apple' ? 'apple' : 'email' };
}

/** Whether this phone holds any rounds, courses or players (another account signing in must ask before replacing them). */
function hasLocalData(): boolean {
  const p = useProfileStore.getState();
  return p.profiles.length > 0 || p.groups.length > 0 || useHistoryStore.getState().entries.length > 0 || useCourseStore.getState().userCourses.length > 0 || useRoundStore.getState().round != null;
}

/** A new session (a fresh sign-in). Another account's data on this phone is never uploaded without asking. */
async function adoptSession(user: AccountUser): Promise<void> {
  const auth = useAuthStore.getState();
  const previous = await lastSyncedAccount();
  if (previous && previous !== user.userId) {
    if (hasLocalData()) {
      auth.setPendingSwitch(user);
      return;
    }
    await resetSync();
  }
  await saveSnapshot({ mode: 'account', ...user });
  auth.setPendingSwitch(undefined);
  auth.setSignedIn(user);
  await startSync(user.userId);
}

async function onAuthEvent(event: AuthChangeEvent, session: Session | null): Promise<void> {
  const auth = useAuthStore.getState();
  if (session) {
    const user = userOf(session);
    if (auth.status === 'signed-in' && auth.userId === user.userId) {
      // The same person: a refreshed token, or signing in again after the session lapsed. Sync carries on.
      if (auth.sessionExpired) auth.setSessionExpired(false);
      resumeSync();
      return;
    }
    await adoptSession(user);
    return;
  }
  if (event === 'SIGNED_OUT' && !signingOut && auth.status === 'signed-in') {
    // The server ended the session (revoked, or the refresh token is no longer valid). Keep everything on the phone and
    // ask the person to sign in again; sync picks up where it stopped when they do.
    auth.setSessionExpired(true);
  }
  // No session for any other reason (offline with an expired token, never signed in): nothing changes.
}

/**
 * Open the app from what is saved on this phone, then follow the session in the background. Never waits on the
 * network. Without a backend the app runs local-only (status 'disabled').
 */
export async function initAuth(): Promise<void> {
  if (started) return;
  started = true;
  const auth = useAuthStore.getState();
  if (!backendConfigured) {
    auth.setStatus('disabled');
    return;
  }
  try {
    const snap = await withTimeout(storage.get<AuthSnapshot>(AUTH_KEY), 2000);
    if (snap?.mode === 'account' && snap.userId) {
      auth.setSignedIn(snap);
      void startSync(snap.userId);
    } else if (snap?.mode === 'local') {
      auth.setLocal();
    } else {
      // Nothing chosen yet. A build from before optional accounts may have left a session: adopt it, offline.
      const stored = await withTimeout(readStoredSessionUser(), 2000).catch(() => null);
      if (stored) {
        const user: AccountUser = { userId: stored.userId, email: stored.email, method: stored.provider === 'apple' ? 'apple' : 'email' };
        await saveSnapshot({ mode: 'account', ...user });
        auth.setSignedIn(user);
        void startSync(user.userId);
      } else auth.setSignedOut();
    }
  } catch {
    // Storage could not be read in time. The welcome screen still offers "Continue without an account", and nothing
    // on the phone has been touched.
    if (useAuthStore.getState().status === 'loading') auth.setSignedOut();
  }
  try {
    supabase().auth.onAuthStateChange((event, session) => {
      // Supabase advises against awaiting other client calls inside this callback.
      setTimeout(() => void onAuthEvent(event, session), 0);
    });
  } catch {
    // A broken client only means no sync; the app itself keeps working.
  }
}

/** "Continue without an account": everything stays on this phone. Signing in later uploads it. */
export async function continueWithoutAccount(): Promise<void> {
  await saveSnapshot({ mode: 'local' });
  useAuthStore.getState().setLocal();
}

/** Whether this device can show the Sign in with Apple button. */
export async function appleSignInAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync().catch(() => false));
}

/** Apple's sheet, then a Supabase session. Returns the name Apple shares on the very first sign-in, if any. Null if cancelled. */
export async function signInWithApple(): Promise<{ name?: string } | null> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple did not return a sign-in token. Try again.');
  const { error } = await supabase().auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
  if (error) throw error;
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim();
  return name ? { name } : {};
}

export type AfterSignIn = { kind: 'signed-in'; pulled: boolean } | { kind: 'switch' };

/**
 * After a successful sign-in call: wait for the session to land and the account's data to come down (at most ~15 s).
 * `pulled` is false when that did not happen in time (offline); `switch` means another account's data is on this phone.
 */
export async function afterSignIn(timeoutMs = 15000): Promise<AfterSignIn> {
  const ready = (s: ReturnType<typeof useAuthStore.getState>) => !!s.pendingSwitch || (s.status === 'signed-in' && !s.sessionExpired);
  const landed = new Promise<void>((resolve) => {
    if (ready(useAuthStore.getState())) return resolve();
    const off = useAuthStore.subscribe((s) => {
      if (ready(s)) {
        off();
        resolve();
      }
    });
  });
  try {
    await withTimeout(landed, timeoutMs);
  } catch {
    return { kind: 'signed-in', pulled: false };
  }
  if (useAuthStore.getState().pendingSwitch) return { kind: 'switch' };
  const { pulled } = await withTimeout(whenSyncStarted(), timeoutMs).catch(() => ({ pulled: false }));
  return { kind: 'signed-in', pulled };
}

/** Another account's data is on this phone: replace it with the new account's (the person said yes). */
export async function confirmAccountSwitch(): Promise<void> {
  const to = useAuthStore.getState().pendingSwitch;
  if (!to) return;
  await clearLocal();
  await saveSnapshot({ mode: 'account', ...to });
  useAuthStore.getState().setPendingSwitch(undefined);
  useAuthStore.getState().setSignedIn(to);
  await startSync(to.userId);
}

/** Keep this phone's data as it was: sign the new account out again and go back to how things were. */
export async function cancelAccountSwitch(): Promise<void> {
  await endSessionOnThisPhone();
  useAuthStore.getState().setPendingSwitch(undefined);
  const snap = await storage.get<AuthSnapshot>(AUTH_KEY);
  const auth = useAuthStore.getState();
  if (snap?.mode === 'account' && snap.userId) {
    // The earlier account's session was replaced by the attempt, so it needs its own sign-in to sync again.
    auth.setSignedIn(snap);
    auth.setSessionExpired(true);
  } else if (snap?.mode === 'local') auth.setLocal();
  else auth.setSignedOut();
}

/** Email a 6-digit code (creates the account on first use). Also used to send it again. */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw error;
}

/** The name on the account (profiles.display_name), or '' when none is set yet. */
export async function accountName(): Promise<string> {
  const userId = useAuthStore.getState().userId;
  if (!userId) return '';
  const { data } = await supabase().from('profiles').select('display_name').eq('id', userId).maybeSingle();
  return (data?.display_name as string | undefined)?.trim() ?? '';
}

/** Set the account's name and make sure this phone has a matching "me" player profile. */
export async function setAccountName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return;
  saveMyName(trimmed);
  const userId = useAuthStore.getState().userId;
  if (!userId) return;
  const me = useProfileStore.getState().profiles.find((p) => p.id === usePreferences.getState().meProfileId);
  await supabase().from('profiles').update({ display_name: trimmed, handicap_index: me?.handicapIndex ?? null, updated_at: new Date().toISOString() }).eq('id', userId);
}

/** Whether the person still needs to tell us their name (no "me" profile after the first sync). */
export function needsName(): boolean {
  const { meProfileId } = usePreferences.getState();
  return !meProfileId || !useProfileStore.getState().profiles.some((p) => p.id === meProfileId);
}

/** Wipe this phone's rounds, courses, players and sync bookkeeping (preferences that are device-only stay). */
async function clearLocal(): Promise<void> {
  await resetSync();
  await clearAllData();
  usePreferences.getState().update({ meProfileId: undefined, homeArea: undefined, bag: undefined });
}

/** End the session on this phone only, even without signal (other phones stay signed in). */
async function endSessionOnThisPhone(): Promise<void> {
  signingOut = true;
  try {
    await withTimeout(supabase().auth.signOut({ scope: 'local' }), 3000).catch(() => undefined);
  } finally {
    signingOut = false;
  }
  await removeStoredSession();
}

/**
 * Sign out of this phone. Anything not yet synced is sent first; if some of it cannot be sent (no signal), nothing is
 * signed out and the count comes back, so the screen can ask. `discardUnsynced` signs out anyway. Then this phone's
 * rounds, courses and players are removed; signing back in brings them back.
 */
export async function signOut(opts: { discardUnsynced?: boolean } = {}): Promise<{ unsynced: number }> {
  if (!opts.discardUnsynced) {
    const unsynced = await flushWithin(10000);
    if (unsynced > 0) return { unsynced };
  }
  await endSessionOnThisPhone();
  await clearLocal();
  await saveSnapshot(null);
  useAuthStore.getState().setSignedOut();
  return { unsynced: 0 };
}

/** The function's own message ("Try again in a minute"), when the error carries one. */
async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (context?.json) {
    const body = (await context.json().catch(() => null)) as { error?: unknown } | null;
    if (body && typeof body.error === 'string') return body.error;
  }
  return 'Could not delete the account. Check your connection and try again.';
}

/**
 * Delete the account and everything stored with it (Apple requires this in-app), then clear this phone. For an Apple
 * account, Apple asks once more: its one-time code lets the server revoke the app's Sign in with Apple tokens, as Apple
 * requires, without the server ever storing an Apple token.
 */
export async function deleteAccount(): Promise<void> {
  let authorizationCode: string | undefined;
  if (useAuthStore.getState().method === 'apple' && Platform.OS === 'ios') {
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
      authorizationCode = credential.authorizationCode ?? undefined;
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new Error('Deleting the account needs that Apple confirmation. Nothing was deleted.');
      throw e;
    }
    if (!authorizationCode) throw new Error('Apple did not confirm. Nothing was deleted; try again.');
  }
  const { error } = await supabase().functions.invoke('delete-account', { body: authorizationCode ? { authorizationCode } : {} });
  if (error) throw new Error(await functionErrorMessage(error));
  await endSessionOnThisPhone();
  await clearLocal();
  await saveSnapshot(null);
  useAuthStore.getState().setSignedOut();
}

/** Test hook: forget that auth started. */
export function resetAuthForTests(): void {
  started = false;
  signingOut = false;
}
