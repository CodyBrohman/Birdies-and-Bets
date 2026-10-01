import { View } from 'react-native';
import { Avatar, Badge, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { ActiveGame, GameMode, Player, ProgressionCell, Standings } from '@/types';
import { describeProgression, describeStandingsLine, formatStake } from '@/lib/format';

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
 * One active game, in its own vocabulary: category dot, name, stake, basis badge, callout, then rows.
 * VoiceOver reads the header, the callout (with the hole-by-hole story for head-to-head games) and each row on its own.
 */
export function StandingsCard({ mode, active, standings, stakeLabel, players, detailed = true }: StandingsCardProps) {
  const { c, radius, space } = useTheme();
  const betting = mode.category === 'betting';
  const stake = typeof active.config.stake === 'number' ? active.config.stake : 0;
  const stakeField = mode.configFields.find((f) => f.key === 'stake');
  const stakeText = stake ? `${formatStake(stake, stakeLabel)}${stakeField && stakeField.type === 'number' && stakeField.unit ? ` ${stakeField.unit}` : ''}` : betting ? 'no stake' : '';
  const callout = standings.subline ?? standings.headline;
  const leaderValue = Math.max(...standings.lines.map((l) => (typeof l.value === 'number' ? l.value : -Infinity)));

  const nameOf = (id: string | undefined) => (id ? players.find((p) => p.id === id)?.name : undefined);
  const story = standings.progression ? describeProgression(standings.progression, nameOf(standings.lines[0]?.playerId) ?? 'side A', nameOf(standings.lines[1]?.playerId) ?? 'side B') : null;
  const calloutLabel = [standings.headline, standings.subline, story].filter(Boolean).join('. ');

  return (
    <Card padding="roomy">
      <View accessible accessibilityRole="header" accessibilityLabel={[mode.name, stakeText, mode.supportsNet ? standings.basis : null].filter(Boolean).join(', ')} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: betting ? c.accent : c.gold }} />
        <Text step="headline" numberOfLines={2} style={{ flexShrink: 1 }}>
          {mode.name}
        </Text>
        {stakeText ? (
          <Text step="body" tone="secondary" style={{ flex: 1 }} numberOfLines={2}>
            {stakeText}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {mode.supportsNet ? <Badge label={standings.basis} tone={standings.basis === 'net' ? 'net' : 'gross'} /> : null}
      </View>

      <View accessible accessibilityLabel={calloutLabel} style={{ marginTop: space[4], padding: space[4], borderRadius: radius.lg, backgroundColor: betting ? c.accentTint : c.goldTint }}>
        <Text step="body" style={{ color: betting ? c.accentTintText : c.goldTintText }}>
          {callout}
        </Text>
      </View>

      {standings.progression ? <Progression cells={standings.progression} /> : null}

      {detailed && standings.lines.length > 0 ? (
        <View style={{ marginTop: space[3], borderTopWidth: 1, borderTopColor: c.dividerSoft }}>
          {standings.lines.map((l, i) => {
            const player = l.playerId ? players.find((p) => p.id === l.playerId) : undefined;
            const playerIndex = l.playerId ? players.findIndex((p) => p.id === l.playerId) : -1;
            const { left, right } = splitLine(l.text);
            const label = player ? left.replace(new RegExp(`^${player.name}\\s*`), '') : left;
            const leading = typeof l.value === 'number' && l.value > 0 && l.value === leaderValue;
            return (
              <View
                key={l.playerId ?? i}
                accessible
                accessibilityLabel={describeStandingsLine(l.text, player?.name, leading)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[2], borderBottomWidth: i === standings.lines.length - 1 ? 0 : 1, borderBottomColor: c.dividerSoft }}
              >
                {player ? <Avatar name={player.name} index={playerIndex} size={40} /> : null}
                <Text step="body" style={{ flex: 1 }} numberOfLines={3}>
                  {player ? player.name : left}
                </Text>
                {player && label && label !== player.name && right ? (
                  <Text step="body" tone="secondary" numberOfLines={2} style={{ flexShrink: 1 }}>
                    {label}
                  </Text>
                ) : null}
                {right ? (
                  <Text step="total" tone={leading ? 'accent' : 'primary'} numberOfLines={1}>
                    {right}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Generic per-hole strip. Head-to-head tones draw a bar up (a) or down (b) or a centred tick (half);
 * chip tones draw a small labelled square (win = filled, carry = tinted). Hidden from VoiceOver: the callout tells the story.
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
                <View style={{ position: 'absolute', bottom: 0, width: 3, height: 14, borderRadius: 2, backgroundColor: c.gold }} />
              ) : cell.tone === 'half' ? (
                <View style={{ width: 3, height: 4, borderRadius: 2, backgroundColor: c.dividerSoft }} />
              ) : null}
            </View>
          ) : (
            <View
              style={{
                width: '100%',
                aspectRatio: 1,
                maxWidth: 22,
                borderRadius: radius.xs,
                backgroundColor: cell.tone === 'win' ? c.inverse : cell.tone === 'carry' ? c.accentTint : c.surface,
                borderWidth: cell.tone === 'none' ? 1 : 0,
                borderColor: c.dividerSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cell.label ? (
                <Text step="caption" maxFontSizeMultiplier={1.2} style={{ fontSize: 13, lineHeight: 14, color: cell.tone === 'win' ? c.onInverse : c.accentTintText }} numberOfLines={1}>
                  {cell.label}
                </Text>
              ) : null}
            </View>
          )}
          <Text step="caption" tone="tertiary" maxFontSizeMultiplier={1.2} style={{ lineHeight: 14 }}>
            {cell.holeNumber}
          </Text>
        </View>
      ))}
    </View>
  );
}
