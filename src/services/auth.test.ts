// Accounts: what the app does at launch, when the session changes, and when someone signs out, deletes or switches.
// The backend keys are set before the services load, so these run as a build with accounts on.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, useAuthStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore } from '@/store';

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://abcdefgh.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

jest.mock('./sync', () => ({
  startSync: jest.fn(() => Promise.resolve()),
  resetSync: jest.fn(() => Promise.resolve()),
  resumeSync: jest.fn(),
  flushWithin: jest.fn(() => Promise.resolve(0)),
  lastSyncedAccount: jest.fn(() => Promise.resolve(undefined)),
  whenSyncStarted: jest.fn(() => Promise.resolve({ pulled: true })),
}));

const auth = require('./auth') as typeof import('./auth');
const { setSupabaseForTests, AUTH_STORAGE_KEY } = require('./supabase') as typeof import('./supabase');
const sync = jest.requireMock('./sync') as Record<string, jest.Mock>;

type Listener = (event: string, session: unknown) => void;
let listeners: Listener[] = [];
const client = {
  auth: {
    onAuthStateChange: jest.fn((cb: Listener) => {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe() {} } } };
    }),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
  },
  functions: { invoke: jest.fn(() => Promise.resolve({ data: { ok: true }, error: null })) },
};

const session = (id: string, email = `${id}@example.com`, provider = 'email') => ({ user: { id, email, app_metadata: { provider } } });
const tick = () => new Promise((r) => setTimeout(r, 0));
/** Deliver an auth event the way supabase-js does, then let the handler (deferred with setTimeout) finish. */
async function emit(event: string, s: unknown) {
  for (const l of listeners) l(event, s);
  for (let i = 0; i < 5; i++) await tick();
}

beforeEach(async () => {
  jest.clearAllMocks();
  listeners = [];
  auth.resetAuthForTests();
  setSupabaseForTests(client as never);
  await AsyncStorage.clear();
  useAuthStore.setState({ status: 'loading', sessionExpired: false, pendingSwitch: undefined, userId: undefined, email: undefined, method: undefined });
  useProfileStore.setState({ profiles: [], groups: [] });
  useHistoryStore.setState({ entries: [] });
  useRoundStore.setState({ round: null, undo: [] });
  usePreferences.setState({ ...DEFAULT_PREFERENCES, hydrated: true });
});

afterAll(() => setSupabaseForTests(null));

describe('launch', () => {
  it('nothing chosen yet: the welcome screen', async () => {
    await auth.initAuth();
    expect(useAuthStore.getState().status).toBe('signed-out');
  });

  it('a signed-in account opens straight in from what is saved, without waiting on the network', async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'account', userId: 'u1', email: 'cody@example.com', method: 'apple' }));
    await auth.initAuth();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', userId: 'u1', method: 'apple', sessionExpired: false });
    expect(sync.startSync).toHaveBeenCalledWith('u1');
  });

  it('no account chosen earlier: local mode', async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'local' }));
    await auth.initAuth();
    expect(useAuthStore.getState().status).toBe('local');
    expect(sync.startSync).not.toHaveBeenCalled();
  });

  it('an older build left a session: it is adopted offline, read straight from storage', async () => {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ access_token: 'expired', refresh_token: 'r', expires_at: 1, user: { id: 'u-old', email: 'old@example.com', app_metadata: { provider: 'apple' } } }));
    await auth.initAuth();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', userId: 'u-old', method: 'apple' });
    expect(JSON.parse((await AsyncStorage.getItem('bb:auth'))!)).toMatchObject({ mode: 'account', userId: 'u-old' });
  });
});

describe('session changes', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'account', userId: 'u1', email: 'cody@example.com', method: 'email' }));
    await auth.initAuth();
  });

  it('no session at launch (offline, token expired) changes nothing', async () => {
    await emit('INITIAL_SESSION', null);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', userId: 'u1', sessionExpired: false });
  });

  it('the server ending the session keeps everything and asks to sign in again', async () => {
    useProfileStore.getState().addProfile('Marcus');
    await emit('SIGNED_OUT', null);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', userId: 'u1', sessionExpired: true });
    expect(useProfileStore.getState().profiles).toHaveLength(1);
    // Signing in again as the same person resumes sync.
    await emit('SIGNED_IN', session('u1'));
    expect(useAuthStore.getState().sessionExpired).toBe(false);
    expect(sync.resumeSync).toHaveBeenCalled();
  });

  it("another account signing in on a phone with this account's data asks first; keeping it changes nothing", async () => {
    sync.lastSyncedAccount!.mockResolvedValue('u1');
    useProfileStore.getState().addProfile('Marcus');
    await emit('SIGNED_OUT', null);
    await emit('SIGNED_IN', session('u2', 'pat@example.com'));
    expect(useAuthStore.getState().pendingSwitch).toMatchObject({ userId: 'u2', email: 'pat@example.com' });
    expect(sync.startSync).toHaveBeenCalledTimes(1); // only the launch for u1; nothing for u2 yet
    expect(await auth.afterSignIn(100)).toEqual({ kind: 'switch' });

    await auth.cancelAccountSwitch();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', userId: 'u1', sessionExpired: true, pendingSwitch: undefined });
    expect(useProfileStore.getState().profiles).toHaveLength(1);
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('replacing the data clears this phone, then the new account syncs', async () => {
    sync.lastSyncedAccount!.mockResolvedValue('u1');
    useProfileStore.getState().addProfile('Marcus');
    await emit('SIGNED_IN', session('u2'));
    await auth.confirmAccountSwitch();
    expect(sync.resetSync).toHaveBeenCalled();
    expect(useProfileStore.getState().profiles).toHaveLength(0);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', userId: 'u2', pendingSwitch: undefined });
    expect(sync.startSync).toHaveBeenLastCalledWith('u2');
  });
});

describe('choosing, signing out and deleting', () => {
  it('continuing without an account is remembered', async () => {
    await auth.initAuth();
    await auth.continueWithoutAccount();
    expect(useAuthStore.getState().status).toBe('local');
    expect(JSON.parse((await AsyncStorage.getItem('bb:auth'))!)).toEqual({ mode: 'local' });
  });

  it('signing in from local mode keeps and uploads what is on the phone (no other account was here)', async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'local' }));
    await auth.initAuth();
    useProfileStore.getState().addProfile('Marcus');
    await emit('SIGNED_IN', session('u1'));
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', userId: 'u1' });
    expect(useProfileStore.getState().profiles).toHaveLength(1);
    expect(sync.startSync).toHaveBeenCalledWith('u1');
    expect(await auth.afterSignIn(100)).toEqual({ kind: 'signed-in', pulled: true });
  });

  it('sign out with changes that could not be sent: nothing happens, and the count comes back', async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'account', userId: 'u1' }));
    await auth.initAuth();
    useProfileStore.getState().addProfile('Marcus');
    sync.flushWithin!.mockResolvedValueOnce(2);
    expect(await auth.signOut()).toEqual({ unsynced: 2 });
    expect(useAuthStore.getState().status).toBe('signed-in');
    expect(useProfileStore.getState().profiles).toHaveLength(1);
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it('sign out (or "anyway") ends the session on this phone only, even offline, and clears the phone', async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'account', userId: 'u1' }));
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: { id: 'u1' } }));
    await auth.initAuth();
    useProfileStore.getState().addProfile('Marcus');
    client.auth.signOut.mockRejectedValueOnce(new Error('Network request failed'));
    expect(await auth.signOut({ discardUnsynced: true })).toEqual({ unsynced: 0 });
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await AsyncStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem('bb:auth')).toBeNull();
    expect(useProfileStore.getState().profiles).toHaveLength(0);
    expect(useAuthStore.getState().status).toBe('signed-out');
    // Our own sign-out is not mistaken for the server ending the session.
    await emit('SIGNED_OUT', null);
    expect(useAuthStore.getState().status).toBe('signed-out');
  });

  it('deleting an email account goes through the server function, then clears the phone', async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'account', userId: 'u1', method: 'email' }));
    await auth.initAuth();
    await auth.deleteAccount();
    expect(client.functions.invoke).toHaveBeenCalledWith('delete-account', { body: {} });
    expect(useAuthStore.getState().status).toBe('signed-out');
  });

  it('a failed delete keeps everything and says why', async () => {
    await AsyncStorage.setItem('bb:auth', JSON.stringify({ mode: 'account', userId: 'u1', method: 'email' }));
    await auth.initAuth();
    useProfileStore.getState().addProfile('Marcus');
    client.functions.invoke.mockResolvedValueOnce({ data: null, error: { context: { json: () => Promise.resolve({ error: 'Apple did not answer. Nothing was deleted; try again in a minute.' }) } } } as never);
    await expect(auth.deleteAccount()).rejects.toThrow('Apple did not answer. Nothing was deleted; try again in a minute.');
    expect(useAuthStore.getState().status).toBe('signed-in');
    expect(useProfileStore.getState().profiles).toHaveLength(1);
  });
});
