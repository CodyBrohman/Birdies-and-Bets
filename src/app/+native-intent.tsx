import { cardPayloadFromUrl } from '@/lib/cardLink';

/**
 * Incoming links, before Expo Router matches them. A shared card carries its data after "#", which routing drops,
 * so https://www.birdiesandbets.com/card#v1.… (or birdiesandbets://card#v1.…) becomes /card?d=v1.….
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const payload = cardPayloadFromUrl(path);
  return payload ? `/card?d=${encodeURIComponent(payload)}` : path;
}
