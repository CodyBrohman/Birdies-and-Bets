import { router, type Href } from 'expo-router';

/**
 * Pop the current screen, or go to `fallback` when there is nothing to pop.
 * Happens when a screen is the first one loaded (deep link, web refresh,
 * cold start into a setup step): `router.back()` is then a silent no-op.
 */
export function goBackOr(fallback: Href | '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as Href);
}
