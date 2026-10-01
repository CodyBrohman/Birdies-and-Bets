import { View } from 'react-native';
import { Card, Chip, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { GameMode, HoleInputSpec, Player } from '@/types';

export interface HoleInputCardProps {
  mode: GameMode;
  participants: Player[];
  answers: Record<string, string>;
  onAnswer: (key: string, value: string | undefined) => void;
}

/** Prompts visible given earlier answers (showIf). */
export function visibleInputs(specs: HoleInputSpec[], answers: Record<string, string>): HoleInputSpec[] {
  return specs.filter((s) => !s.showIf || answers[s.showIf.key] === s.showIf.equals);
}

/** Required prompts (everything but 'confirm') that still need an answer. */
export function missingInputs(specs: HoleInputSpec[], answers: Record<string, string>): HoleInputSpec[] {
  return visibleInputs(specs, answers).filter((s) => s.type !== 'confirm' && !answers[s.key]);
}

/**
 * One prompt card per active game that declares hole inputs. Renders `player`, `choice` and
 * `confirm` prompts as 44pt chips from the spec alone. No branching on game id.
 */
export function HoleInputCard({ mode, participants, answers, onAnswer }: HoleInputCardProps) {
  const { c, space } = useTheme();
  const specs = mode.holeInputs ?? [];
  const visible = visibleInputs(specs, answers);
  const required = visible.filter((s) => s.type !== 'confirm');
  const done = required.filter((s) => !!answers[s.key]).length;
  const complete = done === required.length;

  return (
    <Card>
      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: mode.category === 'betting' ? c.accent : c.gold }} />
          <Text step="title" style={{ flex: 1 }}>
            {mode.name}
          </Text>
          {required.length > 0 ? (
            <Text step="caption" tone={complete ? 'positiveText' : 'accent'}>
              {done} of {required.length}
            </Text>
          ) : null}
        </View>
        {visible.map((spec) => {
          const options = spec.type === 'player' ? participants.map((p) => p.name) : spec.type === 'choice' ? spec.options : ['Done'];
          const current = answers[spec.key];
          return (
            <View key={spec.key} style={{ gap: space[2] }}>
              <Text step="label" tone="secondary">
                {spec.label}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                {options.map((opt) => {
                  const value = spec.type === 'confirm' ? 'yes' : opt;
                  const on = current === value;
                  return (
                    <Chip
                      key={opt}
                      label={spec.type === 'confirm' && on ? '✓ Done' : opt}
                      accessibilityLabel={`${spec.label}: ${opt}`}
                      selected={on}
                      onPress={() => onAnswer(spec.key, on && spec.type === 'confirm' ? undefined : value)}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
