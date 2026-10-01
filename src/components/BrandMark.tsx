import { Image } from 'react-native';

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
