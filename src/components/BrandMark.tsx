import { Image, View } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

const logo = require('../../assets/logo-mark.png');

/**
 * Brand mark: the Birdies & Bets chip (golf ball, laurel, bird) without the app-icon square, as a transparent PNG.
 * assets/logo.png is the master; logo-mark.png is the same art with the faint square trimmed away.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={logo}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/**
 * The wordmark lockup: the chip beside "Birdies & Bets" in the system font. 'md' heads Home; 'lg' stacks the chip
 * over the name for the sign-in screen. VoiceOver reads it once, as a header.
 */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { space } = useTheme();
  const large = size === 'lg';
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Birdies and Bets"
      style={{ flexDirection: large ? 'column' : 'row', alignItems: 'center', gap: large ? space[3] : space[2] }}
    >
      <BrandMark size={large ? 88 : 34} />
      <Text step={large ? 'title1' : 'title3'} numberOfLines={1}>
        Birdies & Bets
      </Text>
    </View>
  );
}
