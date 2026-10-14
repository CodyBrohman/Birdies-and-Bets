// The Supabase client. Accounts and cloud sync go through here; screens never import it directly.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False in local-only builds (no keys): the app then runs as before, with no sign-in and no sync. */
export const backendConfigured = !!(url && anonKey);

/** Where supabase-js keeps the session: its default name, spelled out so sign-out can always remove it. */
export const AUTH_STORAGE_KEY = url ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token` : 'sb-auth-token';

/** No request waits longer than this: on a course with one bar of signal, a hung request must not hold anything up. */
const REQUEST_TIMEOUT_MS = 15000;

function fetchWithTimeout(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  if (!url || !anonKey) throw new Error('Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).');
  client = createClient(url, anonKey, {
    auth: { storage: AsyncStorage, storageKey: AUTH_STORAGE_KEY, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });
  // Refresh tokens only while the app is in front (the Supabase guidance for React Native).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client?.auth.startAutoRefresh();
      else void client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

export interface StoredSessionUser {
  userId: string;
  email?: string;
  provider?: string;
}

/** The account whose session is saved on this phone, read straight from storage: no network, no token refresh. */
export async function readStoredSessionUser(): Promise<StoredSessionUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as { user?: Record<string, unknown>; currentSession?: { user?: Record<string, unknown> } };
    const user = saved.user ?? saved.currentSession?.user;
    if (!user || typeof user.id !== 'string') return null;
    const appMeta = (user.app_metadata ?? {}) as { provider?: unknown };
    return { userId: user.id, email: typeof user.email === 'string' ? user.email : undefined, provider: typeof appMeta.provider === 'string' ? appMeta.provider : undefined };
  } catch {
    return null;
  }
}

/** Remove the saved session outright. supabase-js can leave it behind when signing out without signal. */
export async function removeStoredSession(): Promise<void> {
  await Promise.all([AsyncStorage.removeItem(AUTH_STORAGE_KEY), AsyncStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`), AsyncStorage.removeItem(`${AUTH_STORAGE_KEY}-user`)]).catch(() => undefined);
}

/** Test hook: use a fake client. */
export function setSupabaseForTests(fake: SupabaseClient | null): void {
  client = fake;
}
