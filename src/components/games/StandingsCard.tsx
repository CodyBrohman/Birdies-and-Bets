import { View } from 'react-native';
import { BasisTag, Text } from '@/components/ui';
import { seatColors, useTheme } from '@/theme';
import type { ActiveGame, GameMode, Player, ProgressionCell, Standings } from '@/types';
import { describeProgression, describeStandingsLine, formatStake, withoutName } from '@/lib/format';

export interface StandingsCardProps {
  mode: GameMode;
  active: ActiveGame;
  standings: Standings;
  stakeLabel: string;
  players: Player[];
  /** Show per-player lines under the headline. */
  detailed?: boolean;
}

/** Split "Marcus · 9 skins" into a label and a trailing value for the row layout. */
function splitLine(text: string): { left: string; right: string | null } {
  const idx = text.lastIndexOf(' · ');
  if (idx === -1) return { left: text, right: null };
  return { left: text.slice(0, idx), right: text.slice(idx + 3) };
}

/**
 * One game in the standings: its name, stake and basis; a sentence on who leads and what the next hole is worth; the
 * hole-by-hole strip (two rows of nine); then a row per player. VoiceOver reads the header, the sentence with the
 * hole-by-hole story, and each row.
 */
export function StandingsCard({ mode, active, standings, stakeLabel, players, detailed = true }: StandingsCardProps) {
  const { c, w, space } = useTheme();
  const stake = typeof active.config.stake === 'number' ? active.config.stake : 0;
  const stakeField = mode.configFields.find((f) => f.key === 'stake');
  const stakeText = stake ? `${formatStake(stake, stakeLabel)}${stakeField && stakeField.type === 'number' && stakeField.unit ? ` ${stakeField.unit}` : ''}` : 'Just for fun';
  const leaderValue = Math.max(...standings.lines.map((l) => (typeof l.value === 'number' ? l.value : -Infinity)));

  const nameOf = (id: string | undefined) => (id ? players.find((p) => p.id === id)?.name : undefined);
  const story = standings.progression ? describeProgression(standings.progression, nameOf(standings.lines[0]?.playerId) ?? 'side A', nameOf(standings.lines[1]?.playerId) ?? 'side B') : null;

  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, padding: space[4], gap: space[3] }}>
      <View accessible accessibilityRole="header" accessibilityLabel={[mode.name, stakeText, mode.supportsNet ? standings.basis : null].filter(Boolean).join(', ')} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text step="rowTitle" numberOfLines={1}>
            {mode.name}
          </Text>
          <Text step="footnote" tone="secondary" numberOfLines={1}>
            {stakeText}
          </Text>
        </View>
        {mode.supportsNet ? <BasisTag basis={standings.basis} /> : null}
      </View>

      <View accessible accessibilityLabel={[standings.headline, standings.subline, story].filter(Boolean).join('. ')} style={{ gap: 2 }}>
        <Text step="title3">{standings.headline}</Text>
        {standings.subline ? (
          <Text step="subhead" tone="secondary">
            {standings.subline}
          </Text>
        ) : null}
      </View>

      {standings.progression ? <Progression cells={standings.progression} /> : null}

      {detailed && standings.lines.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.divider }}>
          {standings.lines.map((l, i) => {
            const player = l.playerId ? players.find((p) => p.id === l.playerId) : undefined;
            const seat = l.playerId ? players.findIndex((p) => p.id === l.playerId) : -1;
            const { left, right } = splitLine(l.text);
            // Plain text, not a pattern: a name like "Bob (Jr" must not break the row.
            const label = player ? withoutName(left, player.name) : left;
            const leading = typeof l.value === 'number' && l.value > 0 && l.value === leaderValue;
            return (
              <View
                key={l.playerId ?? i}
                accessible
                accessibilityLabel={describeStandingsLine(l.text, player?.name, leading)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44, paddingVertical: space[2], borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}
              >
                {player ? <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: seatColors[Math.max(0, seat) % seatColors.length]!.fill }} /> : null}
                <Text step="rowBody" style={{ flex: 1 }} numberOfLines={2}>
                  {player ? player.name : left}
                  {player && label && label !== player.name && right ? <Text step="subhead" tone="secondary">{`  ${label}`}</Text> : null}
                </Text>
                {right ? (
                  <Text step="rowBody" tabular style={{ fontWeight: leading ? w.semibold : w.regular }} numberOfLines={1}>
                    {right}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The hole-by-hole strip, nine to a row so every cell stays at least 32pt. Head-to-head games draw a bar up (first
 * side) or down (second side), a dash for a halved hole; skins draw the winner's initial (filled) or ↷ for a carry.
 * Hidden from VoiceOver: the sentence above tells the story.
 */
function Progression({ cells }: { cells: ProgressionCell[] }) {
  const { c, space } = useTheme();
  const bars = cells.some((x) => x.tone === 'a' || x.tone === 'b' || x.tone === 'half');
  const rows: ProgressionCell[][] = [];
  for (let i = 0; i < cells.length; i += 9) rows.push(cells.slice(i, i + 9));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: space[2] }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
          {row.map((cell) => (
            <View key={cell.holeNumber} style={{ flex: 1, minWidth: 32, alignItems: 'center', gap: 2 }}>
              <Text step="caption2" tone="tertiary" tabular maxFontSizeMultiplier={1.2}>
                {cell.holeNumber}
              </Text>
              {bars ? (
                <View style={{ height: 28, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: c.surface }}>
                  {cell.tone === 'a' ? <View style={{ position: 'absolute', top: 3, width: 4, height: 11, borderRadius: 2, backgroundColor: c.accent }} /> : null}
                  {cell.tone === 'b' ? <View style={{ position: 'absolute', bottom: 3, width: 4, height: 11, borderRadius: 2, backgroundColor: c.gold }} /> : null}
                  {cell.tone === 'half' ? <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: c.tickUpcoming }} /> : null}
                </View>
              ) : (
                <View
                  style={{
                    height: 28,
                    width: '100%',
                    borderRadius: 6,
                    backgroundColor: cell.tone === 'win' ? c.inverse : cell.tone === 'carry' ? c.accentTint : c.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cell.label ? (
                    <Text step="caption1" maxFontSizeMultiplier={1.2} style={{ color: cell.tone === 'win' ? c.onInverse : c.accentTintText }} numberOfLines={1}>
                      {cell.label}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          ))}
          {/* Keep a short last row on the same grid. */}
          {row.length < 9 && rows.length > 1 ? Array.from({ length: 9 - row.length }, (_, k) => <View key={`pad-${k}`} style={{ flex: 1, minWidth: 32 }} />) : null}
        </View>
      ))}
    </View>
  );
}
