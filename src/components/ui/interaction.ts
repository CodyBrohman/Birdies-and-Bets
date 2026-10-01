import { Platform, type PressableStateCallbackType, type ViewStyle } from 'react-native';
import { base, motion } from '@/theme';

/** Pressable state with the web-only hover and keyboard-focus flags react-native-web adds. */
export interface InteractionState {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
}

export function interaction(state: PressableStateCallbackType): InteractionState {
  const s = state as PressableStateCallbackType & { hovered?: boolean; focused?: boolean };
  return { pressed: s.pressed, hovered: !!s.hovered, focused: !!s.focused };
}

/** Web: ease background, shadow and opacity between states. Native colour swaps stay instant (never a transform). */
export const stateTransition: ViewStyle =
  Platform.OS === 'web'
    ? ({ transitionProperty: 'background-color, box-shadow, opacity, border-color', transitionDuration: `${motion.state}ms`, transitionTimingFunction: 'ease-out', cursor: 'pointer' } as ViewStyle)
    : {};

// Web: an accent ring for keyboard focus only (:focus-visible), never after a tap or click. Injected once.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('bb-focus-ring')) {
  const style = document.createElement('style');
  style.id = 'bb-focus-ring';
  style.textContent = `[role="button"]:focus-visible,[role="tab"]:focus-visible,[role="radio"]:focus-visible,[role="switch"]:focus-visible,[role="checkbox"]:focus-visible{outline:2px solid ${base.pine};outline-offset:2px}`;
  document.head.appendChild(style);
}

/** Every control dims to the same level when disabled. */
export const DISABLED_OPACITY = 0.4;
