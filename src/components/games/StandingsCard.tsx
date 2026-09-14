import { View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { ActiveGame, GameMode, ProgressionCell, Standings } from '@/types';

export interface StandingsCardProps {
  mode: GameMode;
  active: ActiveGame;
  standings: Standings;
  stakeUnit: string;
  /** Show per-player lines under the headline. */
  detailed?: boolean;
}

/** One active game, in its own vocabulary. Betting games wear the chip-edge stripe; social games a solid positive bar. */
export function StandingsCard({ mode, active, standings, stakeUnit, detailed = true }: StandingsCardProps) {
  const { c, radius, space } = useTheme();
  const stake = typeof active.config.stake === 'number' ? active.config.stake : 0;
  const stakeField = mode.configFields.find((f) => f.key === 'stake');
  const stakeText = stake ? `${stake} ${stakeUnit}${stakeField && stakeField.type === 'number' && stakeField.unit ? ` ${stakeField.unit}` : ''}` : 'no stake';

  return (
    <Card edge={mode.category === 'betting' ? 'betting' : 'social'} accessible accessibilityLabel={`${mode.name}, ${stakeText}, ${standings.basis}. ${standings.headline}. ${standings.subline ?? ''}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Text step="title" style={{ fontSize: 17, lineHeight: 22 }}>
          {mode.name}
        </Text>
        <Text step="label" tone="secondary" style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
          {stakeText}
        </Text>
        {mode.supportsNet ? (
          <View style={{ borderWidth: 1.5, borderColor: c.textPrimary, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text step="tab">{standings.basis.toUpperCase()}</Text>
          </View>
        ) : null}
      </View>
      <Text step="headline" style={{ marginTop: space[2] }}>
        {standings.headline}
      </Text>
      {standings.subline ? (
        <Text step="label" tone="secondary" style={{ marginTop: 2 }}>
          {standings.subline}
        </Text>
      ) : null}
      {standings.progression ? <Progression cells={standings.progression} /> : null}
      {detailed && standings.lines.length > 0 ? (
        <View style={{ marginTop: space[3], gap: 4 }}>
          {standings.lines.map((l, i) => (
            <Text key={l.playerId ?? i} step="label" tone="secondary">
              {l.text}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Generic per-hole strip. Head-to-head tones draw a bar up (a) or down (b) or a centred tick (half);
 * chip tones draw a small labelled square (win = filled, carry = tinted).
 */
function Progression({ cells }: { cells: ProgressionCell[] }) {
  const { c, radius, space } = useTheme();
  const barStyle = cells.some((x) => x.tone === 'a' || x.tone === 'b' || x.tone === 'half');
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: 2, marginTop: space[3] }}>
      {cells.map((cell) => (
        <View key={cell.holeNumber} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          {barStyle ? (
            <View style={{ height: 30, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
              {cell.tone === 'a' ? (
                <View style={{ position: 'absolute', top: 0, width: 3, height: 14, borderRadius: 2, backgroundColor: c.accent }} />
              ) : cell.tone === 'b' ? (
                <View style={{ position: 'absolute', bottom: 0, width: 3, height: 14, borderRadius: 2, backgroundColor: c.textSecondary }} />
              ) : cell.tone === 'half' ? (
                <View style={{ width: 3, height: 4, borderRadius: 2, backgroundColor: c.divider }} />
              ) : null}
            </View>
          ) : (
            <View
              style={{
                width: '100%',
                aspectRatio: 1,
                maxWidth: 22,
                borderRadius: radius.xs,
                backgroundColor: cell.tone === 'win' ? c.textPrimary : cell.tone === 'carry' ? c.accentTint : c.surface,
                borderWidth: cell.tone === 'none' ? 1 : 0,
                borderColor: c.divider,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cell.label ? (
                <Text step="tab" style={{ fontSize: 9, lineHeight: 11, color: cell.tone === 'win' ? c.surface : c.accentText }} numberOfLines={1}>
                  {cell.label}
                </Text>
              ) : null}
            </View>
          )}
          <Text step="tab" tone="secondary" style={{ fontSize: 9, lineHeight: 10 }}>
            {cell.holeNumber}
          </Text>
        </View>
      ))}
    </View>
  );
}
