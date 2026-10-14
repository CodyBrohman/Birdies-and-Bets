import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { actionSheet, Icon, Pressable, Text } from '@/components/ui';
import { PRESSED_OPACITY, seatColors, useReduceMotion, useTheme } from '@/theme';
import type { GrossScore, Player } from '@/types';
import { RELATION_LABEL } from '@/lib/format';
import { relationToPar } from '@/lib/scoring';
import { StrokeDots } from '@/components/scorecard';

export interface PlayerScoreProps {
  player: Player;
  /** The name shown (first name, or with a last initial when two share it). VoiceOver always says the full name. */
  shortName: string;
  /** Seat in the round (the player's colour). */
  seat: number;
  you: boolean;
  par: number;
  /** This hole's score: undefined = none yet, null = picked up. */
  value: GrossScore | undefined;
  /** Handicap strokes received on this hole (dots by the name). */
  strokes: number;
  /** "+3 thru 6". */
  progress: string | null;
  max: number;
  onStep: (delta: 1 | -1) => void;
  onPar: () => void;
  onPickUp: () => void;
  onClear: () => void;
  /** Position in the round, for the Maestro ids. */
  index: number;
}

/**
 * One player's score on the current hole, in one row so four players fit without scrolling: the name and the round
 * so far on the left (tap or long press it for Picked up and Clear score), then − / number / +. From no score the
 * number shows par in grey: tap it for par, − for a birdie, + for a bogey. The word under the number (Birdie, Bogey,
 * Picked up) says what the colour says.
 */
export function PlayerScore({ player, shortName, seat, you, par, value, strokes, progress, max, onStep, onPar, onPickUp, onClear, index }: PlayerScoreProps) {
  const { c, w, space } = useTheme();
  const reduceMotion = useReduceMotion();
  const [tick] = useState(() => new Animated.Value(1));
  const first = useRef(true);

  // The number ticks when it changes (never under Reduce Motion).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceMotion) return;
    tick.setValue(1.14);
    Animated.spring(tick, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }, [value, reduceMotion, tick]);

  const relation = typeof value === 'number' ? relationToPar(value - par) : undefined;
  const under = relation === 'birdie' || relation === 'eagle' || relation === 'albatross';
  const over = relation === 'bogey' || relation === 'double' || relation === 'triple-plus';
  const numberColor = value === undefined ? c.textTertiary : value === null ? c.textSecondary : under ? c.accentText : over ? c.goldText : c.textPrimary;
  const caption = value === undefined ? 'Tap for par' : value === null ? 'Picked up' : typeof value === 'number' && value - par >= 3 ? `+${value - par}` : relation ? RELATION_LABEL[relation] : '';
  const spoken = value === undefined ? 'no score' : value === null ? 'picked up' : `${value}, ${caption.toLowerCase()}`;

  const menu = async () => {
    const choices = [{ label: 'Picked up', run: onPickUp }, ...(value !== undefined ? [{ label: 'Clear score', run: onClear, destructive: true }] : [])];
    const i = await actionSheet(`${player.name}, this hole`, choices);
    if (i != null) choices[i]?.run();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3], paddingLeft: space[4], paddingRight: space[3] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${player.name}${you ? ', you' : ''}${progress ? `, ${progress}` : ''}. Options`}
        accessibilityHint="Picked up or clear score"
        onPress={() => void menu()}
        onLongPress={() => void menu()}
        testID={`player-${index}`}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 56, justifyContent: 'center', gap: 2, opacity: pressed ? PRESSED_OPACITY : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: seatColors[seat % seatColors.length]!.fill }} />
          <Text step="rowTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
            {shortName}
          </Text>
          {you ? (
            <Text step="subhead" tone="secondary" numberOfLines={1}>
              you
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16 }}>
          <Text step="subhead" tone="secondary" tabular numberOfLines={1} style={{ flexShrink: 1 }}>
            {progress ?? 'No score yet'}
          </Text>
          {strokes !== 0 ? <StrokeDots strokes={strokes} size={6} /> : null}
          <Icon name="chevronDown" size={12} color={c.textTertiary} />
        </View>
      </Pressable>

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${player.name} strokes${strokes > 0 ? `, gets ${strokes} on this hole` : ''}`}
        accessibilityValue={{ text: spoken }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: `Par ${par}` }, { name: 'pickUp', label: 'Picked up' }, { name: 'clear', label: 'Clear score' }]}
        onAccessibilityAction={(e) => {
          const a = e.nativeEvent.actionName;
          if (a === 'increment') onStep(1);
          else if (a === 'decrement') onStep(-1);
          else if (a === 'activate') onPar();
          else if (a === 'pickUp') onPickUp();
          else if (a === 'clear') onClear();
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <StepButton icon="minus" label={`${player.name} one fewer`} disabled={typeof value === 'number' && value <= 1} onPress={() => onStep(-1)} testID={`stepper-minus-${index}`} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${player.name}: par ${par}`} onPress={onPar} testID={`score-${index}`} style={{ width: 64, minHeight: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: tick }] }}>
            <Text step="scoreXL" style={{ color: numberColor }}>
              {value === null ? 'PU' : value === undefined ? par : value}
            </Text>
          </Animated.View>
          <Text step="caption2" tone={value === undefined ? 'tertiary' : 'secondary'} style={{ fontWeight: w.medium }} numberOfLines={1}>
            {caption}
          </Text>
        </Pressable>
        <StepButton icon="plus" label={`${player.name} one more`} disabled={typeof value === 'number' && value >= max} onPress={() => onStep(1)} testID={`stepper-plus-${index}`} />
      </View>
    </View>
  );
}

/** A 52pt round − or + (VoiceOver uses the adjustable control around it; the buttons stay reachable by label). */
function StepButton({ icon, label, disabled, onPress, testID }: { icon: 'plus' | 'minus'; label: string; disabled?: boolean; onPress: () => void; testID: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceRaised2,
        opacity: disabled ? 0.35 : pressed ? PRESSED_OPACITY : 1,
      })}
    >
      <Icon name={icon} size="md" color={c.textPrimary} />
    </Pressable>
  );
}
