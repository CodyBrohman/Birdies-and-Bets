// Accounts: Sign in with Apple (required by Apple once an app has accounts), an emailed 6-digit code (web, testing and
// the App Review demo account), sign-out and account deletion. Session facts go to the auth store; sync starts on sign-in.
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { clearAllData, saveMyName, useAuthStore, usePreferences, useProfileStore, type SignInMethod } from '@/store';
import { backendConfigured, supabase } from './supabase';
import { flush, resetSync, startSync, whenSyncStarted } from './sync';

let started = false;

function methodOf(session: Session): SignInMethod {
  return session.user.app_metadata?.provider === 'apple' ? 'apple' : 'email';
}

async function onSession(session: Session | null): Promise<void> {
  const auth = useAuthStore.getState();
  if (!session) {
    auth.setSignedOut();
    return;
  }
  if (auth.status === 'signed-in' && auth.userId === session.user.id) return;
  auth.setSignedIn({ userId: session.user.id, email: session.user.email ?? undefined, method: methodOf(session) });
  await startSync(session.user.id);
}

/** Restore the saved session and follow sign-in changes. Without a backend the app runs local-only (status 'disabled'). */
export async function initAuth(): Promise<void> {
  if (started) return;
  started = true;
  if (!backendConfigured) {
    useAuthStore.getState().setStatus('disabled');
    return;
  }
  const client = supabase();
  client.auth.onAuthStateChange((_event, session) => {
    // Supabase advises against awaiting other client calls inside this callback.
    setTimeout(() => void onSession(session), 0);
  });
  const { data } = await client.auth.getSession();
  await onSession(data.session);
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
  if (error) throw new Error(error.message);
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim();
  return name ? { name } : {};
}

/** After a successful sign-in call: wait for the session to land and the first sync to finish (at most ~15 s). */
export async function afterSignIn(timeoutMs = 15000): Promise<void> {
  const signedIn = new Promise<void>((resolve) => {
    if (useAuthStore.getState().status === 'signed-in') return resolve();
    const off = useAuthStore.subscribe((s) => {
      if (s.status === 'signed-in') {
        off();
        resolve();
      }
    });
  });
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([signedIn.then(() => whenSyncStarted()), timeout]);
}

/** Email a 6-digit code (creates the account on first use). */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw new Error(error.message);
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

/** Push anything waiting, then sign out and clear this phone, so a borrowed phone keeps nothing. */
export async function signOut(): Promise<void> {
  await flush().catch(() => undefined);
  await supabase().auth.signOut();
  await clearLocal();
  useAuthStore.getState().setSignedOut();
}

/** Delete the account and everything stored with it (Apple requires this in-app), then clear this phone. */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase().rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await supabase()
    .auth.signOut({ scope: 'local' })
    .catch(() => undefined);
  await clearLocal();
  useAuthStore.getState().setSignedOut();
}
