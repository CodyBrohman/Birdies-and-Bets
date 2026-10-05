import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import SignIn from '@/app/sign-in';
import Settings from '@/app/settings';
import { saveMyName, useAuthStore, useSyncStatus } from '@/store';
import { renderScreens, resetStores } from '../screen';

jest.mock('@/services', () => ({
  ...jest.requireActual('@/services'),
  appleSignInAvailable: jest.fn(() => Promise.resolve(false)),
  sendEmailCode: jest.fn(() => Promise.resolve()),
  verifyEmailCode: jest.fn(() => Promise.resolve()),
  afterSignIn: jest.fn(() => Promise.resolve()),
  accountName: jest.fn(() => Promise.resolve('')),
  setAccountName: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve()),
  deleteAccount: jest.fn(() => Promise.resolve()),
}));
const services = jest.requireMock('@/services') as Record<string, jest.Mock>;

const Empty = () => null;

beforeEach(async () => {
  jest.clearAllMocks();
  await resetStores();
});

describe('Sign in', () => {
  it('email: send a code, enter it, then give a name on a first sign-in', async () => {
    renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    fireEvent.press(await screen.findByRole('button', { name: 'Continue with email' }));
    fireEvent.changeText(screen.getByLabelText('Email'), 'cody@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Check your email.')).toBeTruthy();
    expect(services.sendEmailCode).toHaveBeenCalledWith('cody@example.com');

    fireEvent.changeText(screen.getByLabelText('6-digit code'), '12 34 56');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('What should we call you?')).toBeTruthy();
    expect(services.verifyEmailCode).toHaveBeenCalledWith('cody@example.com', '123456');
    expect(useAuthStore.getState().finishing).toBe(true); // the gate keeps this screen open meanwhile

    // The email's first part is offered as a starting point.
    expect(screen.getByLabelText('Your name').props.value).toBe('cody');
    fireEvent.changeText(screen.getByLabelText('Your name'), 'Cody B');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(services.setAccountName).toHaveBeenCalledWith('Cody B'));
    await waitFor(() => expect(useAuthStore.getState().finishing).toBe(false));
  });

  it('skips the name step when the account already has one', async () => {
    saveMyName('Cody');
    const r = renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    fireEvent.press(await screen.findByRole('button', { name: 'Continue with email' }));
    fireEvent.changeText(screen.getByLabelText('Email'), 'cody@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    fireEvent.changeText(await screen.findByLabelText('6-digit code'), '123456');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    expect(screen.queryByText('What should we call you?')).toBeNull();
  });

  it('a wrong code shows the error and stays put', async () => {
    services.verifyEmailCode!.mockRejectedValueOnce(new Error('Token has expired or is invalid'));
    renderScreens({ 'sign-in': SignIn, index: Empty }, '/sign-in');
    fireEvent.press(await screen.findByRole('button', { name: 'Continue with email' }));
    fireEvent.changeText(screen.getByLabelText('Email'), 'cody@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    fireEvent.changeText(await screen.findByLabelText('6-digit code'), '000000');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Token has expired or is invalid')).toBeTruthy();
    expect(useAuthStore.getState().finishing).toBe(false);
  });
});

describe('Settings › Account', () => {
  beforeEach(() => {
    useAuthStore.getState().setSignedIn({ userId: 'u1', email: 'cody@example.com', method: 'email' });
    useSyncStatus.getState().set({ phase: 'offline', pending: 3 });
  });

  it('shows who is signed in and what is waiting to sync', () => {
    saveMyName('Cody');
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    expect(screen.getByText('Signed in as cody@example.com')).toBeTruthy();
    expect(screen.getByText('Offline · 3 changes waiting')).toBeTruthy();
  });

  it('delete account asks first, then deletes', async () => {
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByText('Delete your account?')).toBeTruthy();
    expect(services.deleteAccount).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    await waitFor(() => expect(services.deleteAccount).toHaveBeenCalledTimes(1));
  });

  it('sign out asks first, then signs out', async () => {
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.press(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!);
    await waitFor(() => expect(services.signOut).toHaveBeenCalledTimes(1));
  });

  it('is hidden in local-only builds', () => {
    useAuthStore.getState().setStatus('disabled');
    renderScreens({ settings: Settings, index: Empty }, '/settings');
    expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
  });
});
