import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { haptic } from '@/theme';

export interface SheetAction {
  label: string;
  destructive?: boolean;
}

/**
 * A native action sheet (iOS): the actions plus Cancel. Resolves to the chosen action's index, or null. Elsewhere (the
 * web preview) it falls back to an alert offering the first action.
 */
export function actionSheet(title: string | undefined, actions: SheetAction[]): Promise<number | null> {
  if (Platform.OS === 'ios' && typeof ActionSheetIOS?.showActionSheetWithOptions === 'function') {
    return new Promise((resolve) => {
      const cancelButtonIndex = actions.length;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [...actions.map((a) => a.label), 'Cancel'],
          cancelButtonIndex,
          destructiveButtonIndex: actions.map((a, i) => (a.destructive ? i : -1)).filter((i) => i >= 0),
        },
        (i) => resolve(i === cancelButtonIndex || i == null ? null : i),
      );
    });
  }
  return ask(
    title ?? actions[0]?.label ?? '',
    undefined,
    actions.map((a, i) => ({ label: a.label, value: i, style: a.destructive ? 'destructive' : 'default' })),
  );
}

export interface AskOption<T> {
  label: string;
  value: T;
  /** 'destructive' shows in red on iOS; 'cancel' is the bold dismiss button. */
  style?: 'default' | 'destructive' | 'cancel';
}

/**
 * A native iOS alert with a choice of buttons. Resolves to the chosen value, or null when dismissed. Destructive
 * confirmations use this, never a green button. On web (the preview), Alert does nothing, so the browser's
 * confirm dialog stands in: OK picks the first option that is not the cancel.
 */
export function ask<T>(title: string, message: string | undefined, options: AskOption<T>[]): Promise<T | null> {
  if (Platform.OS === 'web') {
    const first = options.find((o) => o.style !== 'cancel');
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm([title, message].filter(Boolean).join('\n\n')) : false;
    return Promise.resolve(ok && first ? first.value : null);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      options.map((o) => ({ text: o.label, style: o.style ?? 'default', onPress: () => resolve(o.value) })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** The action, in words: "Delete round", never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/** Ask before doing something. Resolves true only when the action button is chosen. */
export async function confirm({ title, message, confirmLabel, cancelLabel = 'Cancel', destructive = false }: ConfirmOptions): Promise<boolean> {
  if (destructive) haptic.warning();
  const answer = await ask(title, message, [
    { label: cancelLabel, value: false, style: 'cancel' },
    { label: confirmLabel, value: true, style: destructive ? 'destructive' : 'default' },
  ]);
  return answer === true;
}
