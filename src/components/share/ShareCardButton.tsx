import { useRef, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Button, Text } from '@/components/ui';
import { ShareCard, type ShareCardProps } from './ShareCard';
import { track } from '@/services';
import { cardDataFrom, cardUrl } from '@/lib/cardLink';

export interface ShareCardButtonProps extends Omit<ShareCardProps, 'width'> {
  label?: string;
}

/**
 * Renders the share card off-screen and shares a PNG of it through the system sheet, with a link that opens the same
 * card on the website (or in the app). Off-screen means far left, not opacity 0: iOS captures transparent views as blank.
 */
export function ShareCardButton({ label = 'Share scorecard', ...card }: ShareCardButtonProps) {
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = () => {
    const anyHandicap = Object.values(card.handicaps).some((h) => h.playingHandicap !== 0);
    const games = card.results.map((r) => ({ name: r.mode.name, basis: r.standings.basis, headline: r.standings.headline, lines: r.standings.lines.map((l) => l.text) }));
    return cardUrl(cardDataFrom({ round: card.round, holes: card.holes, handicaps: card.handicaps, games, basis: card.basis ?? (anyHandicap ? 'net' : 'gross'), completedAt: card.completedAt }));
  };

  const share = async () => {
    setError(null);
    setBusy(true);
    try {
      if (Platform.OS !== 'web' && !(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      const url = link();
      if (Platform.OS === 'web') {
        await navigator.clipboard?.writeText(url).catch(() => undefined);
        window.open(uri, '_blank');
        return;
      }
      // The image plus a line of text with the link: the group chat gets both.
      const result = await Share.share({ url: uri, message: `Our card from ${card.round.course.name}: ${url}` }, { subject: `Scorecard: ${card.round.course.name}` });
      if (result.action === Share.sharedAction) track('scorecard_shared');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share the card.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button label={busy ? 'Preparing…' : label} variant="secondary" disabled={busy} onPress={() => void share()} />
      {error ? (
        <Text step="caption" tone="negative" tabular={false} align="center">
          {error}
        </Text>
      ) : null}
      <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ShareCard ref={ref} {...card} />
      </View>
    </>
  );
}
