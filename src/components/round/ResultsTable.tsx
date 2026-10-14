import { View } from 'react-native';
import { Text } from '@/components/ui';
import { seatColors, useTheme } from '@/theme';
import type { ResultRow } from '@/lib/history';
import { describeToPar, formatSigned, formatToPar } from '@/lib/format';

export interface ResultsTableProps {
  rows: ResultRow[];
  /** Show the Net column (anyone got strokes). */
  showNet: boolean;
  /** Show the Pts column (the round had points games). */
  showPoints: boolean;
}

const COL = 58;

/**
 * Player · Gross · Net · Pts, one row per player in seat order, with "CH 13" under the name. Numbers never wrap: the
 * name truncates first. Each row is one VoiceOver element that reads every column.
 */
export function ResultsTable({ rows, showNet, showPoints }: ResultsTableProps) {
  const { c, w, space } = useTheme();
  const head = (label: string) => (
    <Text step="tableHeader" tone="tertiary" align="right" style={{ width: COL }}>
      {label}
    </Text>
  );
  const cell = (main: string, sub: string | null) => (
    <View style={{ width: COL, alignItems: 'flex-end' }}>
      <Text step="rowTitle" tabular numberOfLines={1}>
        {main}
      </Text>
      {sub ? (
        <Text step="footnote" tone="secondary" tabular numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingHorizontal: space[4] }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: space[2] }}>
        <Text step="tableHeader" tone="tertiary" style={{ flex: 1 }}>
          Player
        </Text>
        {head('Gross')}
        {showNet ? head('Net') : null}
        {showPoints ? head('Pts') : null}
      </View>
      {rows.map((r, i) => {
        const played = r.holesScored > 0;
        const caption = [r.courseHandicap ? `CH ${r.courseHandicap < 0 ? `+${-r.courseHandicap}` : r.courseHandicap}` : null, r.pickedUp ? `PU ${r.pickedUp}` : null].filter(Boolean).join(' · ');
        const label = [
          r.name,
          r.courseHandicap ? `course handicap ${r.courseHandicap}` : null,
          played ? `gross ${r.gross}, ${describeToPar(r.grossToPar)}` : 'no score',
          showNet && played ? `net ${r.net}, ${describeToPar(r.netToPar)}` : null,
          showPoints ? `points ${formatSigned(r.points)}` : null,
          r.pickedUp ? `picked up on ${r.pickedUp}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <View key={r.id} accessible accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 56, paddingVertical: space[2], borderTopWidth: 1, borderTopColor: c.divider }}>
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: seatColors[i % seatColors.length]!.fill }} />
                <Text step="rowTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {r.name}
                </Text>
              </View>
              {caption ? (
                <Text step="footnote" tone="secondary" numberOfLines={1} style={{ paddingLeft: 16 }}>
                  {caption}
                </Text>
              ) : null}
            </View>
            {cell(played ? String(r.gross) : '–', played ? formatToPar(r.grossToPar) : null)}
            {showNet ? cell(played ? String(r.net) : '–', played ? formatToPar(r.netToPar) : null) : null}
            {showPoints ? (
              <View style={{ width: COL, alignItems: 'flex-end' }}>
                <Text step="rowTitle" tabular style={{ fontWeight: w.semibold }}>
                  {r.points > 0 ? `+${r.points}` : formatSigned(r.points)}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
