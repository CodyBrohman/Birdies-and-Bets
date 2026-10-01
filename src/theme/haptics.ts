import * as Haptics from 'expo-haptics';
import { create } from 'zustand';

interface HapticsState {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

/**
 * In-memory haptics switch. Persistence lives in store/preferencesStore so theme/ never imports store/.
 * On by default; the Settings screen turns it off.
 */
export const useHapticsPreference = create<HapticsState>()((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
}));

const on = () => useHapticsPreference.getState().enabled;
const swallow = () => undefined;

/** The only way the app triggers haptics: each call is a no-op when the user has turned them off. */
export const haptic = {
  /** Picking an option: score chips, option chips. */
  selection() {
    if (on()) Haptics.selectionAsync().catch(swallow);
  },
  /** A press with weight: primary buttons, stepper ticks. */
  light() {
    if (on()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(swallow);
  },
  /** A hole confirmed. */
  success() {
    if (on()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow);
  },
};
