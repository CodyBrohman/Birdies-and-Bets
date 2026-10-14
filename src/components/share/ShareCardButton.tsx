import { useRef, useState, type ReactElement } from 'react';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ask, Button } from '@/components/ui';
import { ShareCard, type ShareCardProps } from './ShareCard';
import { track } from '@/services';
import { cardDataFrom, cardUrlWithin } from '@/lib/cardLink';

export type ShareCardInput = Omit<ShareCardProps, 'width'>;

/**
 * Sharing a round: renders the share card off-screen (render `host` somewhere in the screen) and `share()` sends a PNG
 * of it through the system sheet, with a link that opens the same card on the website or in the app. Off-screen means
 * far left, not opacity 0: iOS captures transparent views as blank. A failure is explained in an alert.
 */
export function useShareCard(card: ShareCardInput): { share: () => Promise<void>; busy: boolean; host: ReactElement } {
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  /** The card as a link, or null when it is too big to travel as one (the image still goes). */
  const link = () => {
    const anyHandicap = Object.values(card.handicaps).some((h) => h.playingHandicap !== 0);
    const games = card.results.map((r) => ({ name: r.mode.name, basis: r.standings.basis, headline: r.standings.headline, lines: r.standings.lines.map((l) => l.text) }));
    return cardUrlWithin(cardDataFrom({ round: card.round, holes: card.holes, handicaps: card.handicaps, games, basis: card.basis ?? (anyHandicap ? 'net' : 'gross'), completedAt: card.completedAt }));
  };

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (Platform.OS !== 'web' && !(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      const url = link();
      if (Platform.OS === 'web') {
        if (url) await navigator.clipboard?.writeText(url).catch(() => undefined);
        window.open(uri, '_blank');
        return;
      }
      // The image plus a line of text with the link: the group chat gets both.
      const message = url ? `Our card from ${card.round.course.name}: ${url}` : `Our card from ${card.round.course.name}`;
      const result = await Share.share({ url: uri, message }, { subject: `Scorecard: ${card.round.course.name}` });
      if (result.action === Share.sharedAction) track('scorecard_shared');
    } catch (e) {
      void ask("Couldn't share the card", e instanceof Error && e.message ? e.message : 'Try again in a moment.', [{ label: 'OK', value: true }]);
    } finally {
      setBusy(false);
    }
  };

  const host = (
    <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ShareCard ref={ref} {...card} />
    </View>
  );
  return { share, busy, host };
}

export interface ShareCardButtonProps extends ShareCardInput {
  label?: string;
}

/** A "Share scorecard" button with its own off-screen card. */
export function ShareCardButton({ label = 'Share scorecard', ...card }: ShareCardButtonProps) {
  const { share, busy, host } = useShareCard(card);
  return (
    <>
      <Button label={busy ? 'Preparing…' : label} variant="secondary" disabled={busy} onPress={() => void share()} />
      {host}
    </>
  );
}
