import { Linking } from 'react-native';
import { fireEvent, screen } from 'expo-router/testing-library';
import Settings from '@/app/settings';
import { PRIVACY_POLICY_URL } from '@/services';
import { usePreferences } from '@/store';
import { renderScreens, resetStores } from '../screen';

const Empty = () => null;
const routes = { settings: Settings, index: Empty, profile: Empty, onboarding: Empty };

beforeEach(resetStores);

describe('Settings › Privacy', () => {
  it('turns crash reports off and back on', () => {
    renderScreens(routes, '/settings');
    expect(usePreferences.getState().crashReports).toBe(true);
    fireEvent.press(screen.getByLabelText('Crash reports'));
    expect(usePreferences.getState().crashReports).toBe(false);
    fireEvent.press(screen.getByLabelText('Crash reports'));
    expect(usePreferences.getState().crashReports).toBe(true);
  });

  it('turns usage analytics on', () => {
    renderScreens(routes, '/settings');
    fireEvent.press(screen.getByLabelText('Usage analytics'));
    expect(usePreferences.getState().analytics).toBe(true);
  });

  it('opens the privacy policy', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreens(routes, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Read the privacy policy' }));
    expect(open).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });
});
