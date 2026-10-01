import * as Haptics from 'expo-haptics';
import { haptic, useHapticsPreference } from './haptics';

beforeEach(() => {
  jest.clearAllMocks();
  useHapticsPreference.setState({ enabled: true });
});

describe('haptic', () => {
  it('fires when enabled', () => {
    haptic.selection();
    haptic.light();
    haptic.success();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('is silent when turned off', () => {
    useHapticsPreference.getState().setEnabled(false);
    haptic.selection();
    haptic.light();
    haptic.success();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});
