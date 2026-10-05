// The App Store rating prompt. Apple decides whether its dialog actually shows (at most three times a year);
// we only ask once, after the third finished round, and remember that we did.
import * as StoreReview from 'expo-store-review';
import { usePreferences } from '@/store';

export const ROUNDS_BEFORE_REVIEW = 3;

/** Call after a round is saved to history. Resolves true when the prompt was requested. */
export async function maybeAskForReview(finishedRounds: number): Promise<boolean> {
  const prefs = usePreferences.getState();
  if (finishedRounds < ROUNDS_BEFORE_REVIEW || prefs.reviewPrompted) return false;
  try {
    if (!(await StoreReview.hasAction())) return false;
    // Remember first, so a crash or a second call can never ask twice.
    prefs.update({ reviewPrompted: true });
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
