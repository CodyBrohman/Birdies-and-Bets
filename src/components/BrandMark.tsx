import { View } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Placeholder brand mark: a flag whose cup is a poker chip.
 * Built from views so it needs no SVG dependency yet. Replace with the final mark asset later.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  const { c } = useTheme();
  const pole = Math.max(2, Math.round(size * 0.07));
  const chip = Math.round(size * 0.34);
  const flagW = Math.round(size * 0.5);
  const flagH = Math.round(size * 0.32);

  return (
    <View style={{ width: size, height: size * 1.1, justifyContent: 'flex-end', alignItems: 'flex-start' }}>
      {/* pole */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.28,
          top: 0,
          width: pole,
          height: size * 0.92,
          backgroundColor: c.textPrimary,
          borderRadius: pole,
        }}
      />
      {/* flag */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.28 + pole,
          top: size * 0.04,
          width: flagW,
          height: flagH,
          backgroundColor: c.accent,
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
      {/* chip as the cup */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.28 + pole / 2 - chip / 2,
          bottom: 0,
          width: chip,
          height: chip,
          borderRadius: 999,
          backgroundColor: c.negative,
          borderWidth: Math.max(2, chip * 0.14),
          borderColor: c.surfaceRaised,
          borderStyle: 'dashed',
        }}
      />
    </View>
  );
}
