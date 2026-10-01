import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export interface TileProps extends ViewProps {
  /** Tinted variants for good / attention / current; default is the nested raised box. */
  tone?: 'default' | 'accent' | 'gold' | 'current';
  padding?: 'dense' | 'default';
}

/** A recessed inner box inside a card: recent-hole cells, side-game mini cards, nested groups. Tinted tones keep an edge. */
export function Tile({ tone = 'default', padding = 'default', style, children, ...rest }: TileProps) {
  const { c, radius, space } = useTheme();
  const look = tone === 'accent' ? { bg: c.accentTint, border: c.accentBorder } : tone === 'gold' ? { bg: c.goldTint, border: c.goldBorder } : tone === 'current' ? { bg: c.accentTint, border: c.accent } : { bg: c.surfaceRaised2, border: 'transparent' };
  return (
    <View {...rest} style={[{ backgroundColor: look.bg, borderWidth: tone === 'current' ? 1.5 : tone === 'default' ? 0 : 1, borderColor: look.border, borderRadius: radius.lg, padding: padding === 'dense' ? space[2] : space[3] }, style]}>
      {children}
    </View>
  );
}
