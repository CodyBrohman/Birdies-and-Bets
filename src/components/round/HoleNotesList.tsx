import { View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Hole, HoleResult } from '@/types';

export interface HoleNotesListProps {
  results: HoleResult[];
  /** Holes in play order; notes are listed in this order. */
  order: Hole[];
}

/** "Hole 7 · Lost ball left" rows for every hole with a note. Renders nothing when there are none. */
export function HoleNotesList({ results, order }: HoleNotesListProps) {
  const { c, space } = useTheme();
  const noted = order.map((h) => results.find((r) => r.holeNumber === h.number)).filter((r): r is HoleResult & { note: string } => !!r?.note);
  if (noted.length === 0) return null;
  return (
    <Card variant="outlined" padding="roomy">
      {noted.map((r, i) => (
        <View key={r.holeNumber} style={{ flexDirection: 'row', gap: space[3], paddingVertical: space[2], borderBottomWidth: i === noted.length - 1 ? 0 : 1, borderBottomColor: c.dividerSoft }}>
          <Text step="bodyStrong" tabular style={{ width: 64 }}>
            Hole {r.holeNumber}
          </Text>
          <Text step="body" tone="secondary" style={{ flex: 1 }}>
            {r.note}
          </Text>
        </View>
      ))}
    </Card>
  );
}
