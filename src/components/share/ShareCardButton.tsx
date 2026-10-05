import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Button, Text } from '@/components/ui';
import { ShareCard, type ShareCardProps } from './ShareCard';
import { track } from '@/services';

export interface ShareCardButtonProps extends Omit<ShareCardProps, 'width'> {
  label?: string;
}

/**
 * Renders the share card off-screen and shares a PNG of it through the system sheet.
 * Off-screen means far left, not opacity 0: iOS captures transparent views as blank.
 */
export function ShareCardButton({ label = 'Share scorecard', ...card }: ShareCardButtonProps) {
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    setError(null);
    setBusy(true);
    try {
      if (Platform.OS !== 'web' && !(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      if (Platform.OS === 'web') {
        window.open(uri, '_blank');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share scorecard' });
      track('scorecard_shared');
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
