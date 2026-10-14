import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** "Net" or "Gross", in a small capsule: the basis decides how a game reads the scores. */
export function BasisTag({ basis }: { basis: 'net' | 'gross' }) {
  const { c, w } = useTheme();
  const net = basis === 'net';
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: net ? c.accentTint : c.goldTint }}>
      <Text step="footnote" style={{ color: net ? c.accentTintText : c.goldTintText, fontWeight: w.semibold }}>
        {net ? 'Net' : 'Gross'}
      </Text>
    </View>
  );
}
