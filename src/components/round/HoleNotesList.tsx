import { View } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Hole, HoleResult } from '@/types';

export interface HoleNotesListProps {
  results: HoleResult[];
  /** Holes in play order; notes are listed in this order. */
  order: Hole[];
}

/** "Hole 7 · Lost ball left" for every hole with a note, or a line saying there are none. */
export function HoleNotesList({ results, order }: HoleNotesListProps) {
  const { c, space } = useTheme();
  const noted = order.map((h) => results.find((r) => r.holeNumber === h.number)).filter((r): r is HoleResult & { note: string } => !!r?.note);
  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingHorizontal: space[4] }}>
      {noted.length === 0 ? (
        <Text step="rowBody" tone="secondary" style={{ paddingVertical: space[3] }}>
          No notes for this round
        </Text>
      ) : (
        noted.map((r, i) => (
          <View key={r.holeNumber} accessible accessibilityLabel={`Hole ${r.holeNumber}: ${r.note}`} style={{ flexDirection: 'row', gap: space[3], paddingVertical: space[3], borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}>
            <Text step="rowTitle" tabular style={{ width: 64 }}>
              Hole {r.holeNumber}
            </Text>
            <Text step="rowBody" tone="secondary" style={{ flex: 1 }}>
              {r.note}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
