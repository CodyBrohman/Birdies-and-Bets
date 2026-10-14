import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import SignIn from '@/app/sign-in';
import Settings from '@/app/settings';
import { saveMyName, useAuthStore, useSyncStatus } from '@/store';
import { lastAlert, pressAlert, renderScreens, resetStores } from '../screen';

jest.mock('@/services', () => ({
  ...jest.requireActual('@/services'),
  appleSignInAvailable: jest.fn(() => Promise.resolve(false)),
  sendEmailCode: jest.fn(() => Promise.resolve()),
  verifyEmailCode: jest.fn(() => Promise.resolve()),
  afterSignIn: jest.fn(() => Promise.resolve({ kind: 'signed-in', pulled: true })),
  accountName: jest.fn(() => Promise.resolve('')),
  setAccountName: jest.fn(() => Promise.resolve()),
  continueWithoutAccount: jest.fn(async () => require('@/store').useAuthStore.getState().setLocal()),
  confirmAccountSwitch: jest.fn(() => Promise.resolve()),
  cancelAccountSwitch: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve({ unsynced: 0 })),
  deleteAccount: jest.fn(() => Promise.resolve()),
  retryRejected: jest.fn(() => Promise.resolve()),
}));
const services = jest.requireMock('@/services') as Record<string, jest.Mock>;

const Empty = () => null;

beforeEach(async () => {
  jest.clearAllMocks();
  await resetStores();
});

async function signInByEmail() {
  fireEvent.press(await screen.findByRole('button', { name: 'Continue with email' }));
  fireEvent.changeText(screen.getByLabelText('Email'), 'cody@example.com');
  fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
  fireEvent.changeText(await screen.findByLabelText('6-digit code'), '12 34 56');
  fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('Welcome screen (nothing chosen yet)', () => {
  beforeEach(() => useAuthStore.getState().setSignedOut());

  it('email: send a code, enter it, then give a name on a first sign-in', async () => {
    const r = renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    fireEvent.press(await screen.findByRole('button', { name: 'Continue with email' }));
    fireEvent.changeText(screen.getByLabelText('Email'), 'cody@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Check your email')).toBeTruthy();
    expect(services.sendEmailCode).toHaveBeenCalledWith('cody@example.com');

    fireEvent.changeText(screen.getByLabelText('6-digit code'), '12 34 56');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('What name goes on the scorecard?')).toBeTruthy();
    expect(services.verifyEmailCode).toHaveBeenCalledWith('cody@example.com', '123456');

    // The email's first part is offered as a starting point.
    expect(screen.getByLabelText('Your name').props.value).toBe('cody');
    fireEvent.changeText(screen.getByLabelText('Your name'), 'Cody B');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(services.setAccountName).toHaveBeenCalledWith('Cody B'));
    await waitFor(() => expect(r.getPathname()).toBe('/'));
  });

  it('skips the name step when the account already has one', async () => {
    saveMyName('Cody');
    const r = renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    await signInByEmail();
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    expect(screen.queryByText('What name goes on the scorecard?')).toBeNull();
  });

  it('does not ask for a name before the account data has arrived (offline), so no second "me" is made', async () => {
    services.afterSignIn!.mockResolvedValueOnce({ kind: 'signed-in', pulled: false });
    const r = renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    await signInByEmail();
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    expect(screen.queryByText('What name goes on the scorecard?')).toBeNull();
  });

  it('a wrong code shows a plain message and stays put', async () => {
    services.verifyEmailCode!.mockRejectedValueOnce(Object.assign(new Error('Token has expired or is invalid'), { code: 'otp_expired', status: 403 }));
    renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    await signInByEmail();
    expect(await screen.findByText("That code didn't work. Check it, or send a new one.")).toBeTruthy();
    expect(screen.queryByText(/Token has expired/)).toBeNull();
  });

  it('a new code can be sent again after a minute', async () => {
    renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    fireEvent.press(await screen.findByRole('button', { name: 'Continue with email' }));
    fireEvent.changeText(screen.getByLabelText('Email'), 'cody@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    const resend = await screen.findByRole('button', { name: /^Send a new code in \d+ s$/ });
    expect(resend.props.accessibilityState?.disabled).toBe(true);
  });

  it('carrying on without an account opens the app', async () => {
    const r = renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    fireEvent.press(await screen.findByRole('button', { name: 'Continue without an account' }));
    await waitFor(() => expect(services.continueWithoutAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    expect(useAuthStore.getState().status).toBe('local');
  });

  it("another account's data on this phone: asks before replacing it, and can keep it", async () => {
    services.afterSignIn!.mockResolvedValueOnce({ kind: 'switch' });
    useAuthStore.getState().setPendingSwitch({ userId: 'u2', email: 'pat@example.com', method: 'email' });
    renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    await signInByEmail();
    expect(await screen.findByText("Replace this iPhone's data?")).toBeTruthy();
    expect(screen.getByText(/Signing in as pat@example.com replaces them/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: "Keep this iPhone's data" }));
    await waitFor(() => expect(services.cancelAccountSwitch).toHaveBeenCalledTimes(1));
    expect(services.confirmAccountSwitch).not.toHaveBeenCalled();
  });
});

describe('Sign-in as a sheet (from Settings or Profile)', () => {
  it('has a way out and no "without an account" option', async () => {
    useAuthStore.getState().setLocal();
    const r = renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    expect(await screen.findByRole('button', { name: 'Continue with email' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue without an account' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(r.getPathname()).toBe('/'));
  });
});

describe('Settings › Account', () => {
  const signedIn = () => useAuthStore.getState().setSignedIn({ userId: 'u1', email: 'cody@example.com', method: 'email' });

  it('shows who is signed in and what is waiting to sync', () => {
    signedIn();
    useSyncStatus.getState().set({ phase: 'offline', pending: 3 });
    saveMyName('Cody');
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    expect(screen.getByText('Signed in as cody@example.com')).toBeTruthy();
    expect(screen.getByText('Offline · 3 changes waiting')).toBeTruthy();
  });

  it('delete account asks first (a native alert with a destructive button), then deletes', async () => {
    signedIn();
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
    expect(lastAlert()).toMatchObject({ title: 'Delete your account?', buttons: ['Cancel', 'Delete account'] });
    expect(services.deleteAccount).not.toHaveBeenCalled();
    pressAlert('Delete account');
    await waitFor(() => expect(services.deleteAccount).toHaveBeenCalledTimes(1));
  });

  it('sign out asks first, then signs out', async () => {
    signedIn();
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(lastAlert()?.title).toBe('Sign out?');
    pressAlert('Sign out');
    await waitFor(() => expect(services.signOut).toHaveBeenCalledTimes(1));
  });

  it('signing out with changes that could not be sent asks again before losing them', async () => {
    signedIn();
    services.signOut!.mockResolvedValueOnce({ unsynced: 3 });
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    pressAlert('Sign out');
    await waitFor(() => expect(lastAlert()?.title).toBe('3 changes not synced yet'));
    expect(services.signOut).toHaveBeenCalledTimes(1);
    pressAlert('Sign out anyway');
    await waitFor(() => expect(services.signOut).toHaveBeenLastCalledWith({ discardUnsynced: true }));
  });

  it('an expired session keeps the data and offers to sign in again', () => {
    signedIn();
    useAuthStore.getState().setSessionExpired(true);
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    expect(screen.getByText(/Sign in again to keep syncing; nothing on this iPhone is lost/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in again' })).toBeTruthy();
  });

  it('a change the server refused is shown with a retry', async () => {
    signedIn();
    useSyncStatus.getState().set({ rejected: 1 });
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    expect(screen.getByText("1 item couldn't sync.")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(services.retryRejected).toHaveBeenCalledTimes(1));
  });

  it('without an account, offers to sign in to back up and sync', () => {
    useAuthStore.getState().setLocal();
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    expect(screen.getByText('Not signed in')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in to back up and sync' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
  });

  it('is hidden in local-only builds', () => {
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
    expect(screen.queryByText('Not signed in')).toBeNull();
  });
});
