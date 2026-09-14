import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui';
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
  const { c, radius, space } = useTheme();
  const specs = mode.holeInputs ?? [];
  const visible = visibleInputs(specs, answers);
  const required = visible.filter((s) => s.type !== 'confirm');
  const done = required.filter((s) => !!answers[s.key]).length;
  const complete = done === required.length;

  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
      <ChipEdge />
      <View style={{ padding: space[3], gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text step="title" style={{ fontSize: 17, lineHeight: 22 }}>
            {mode.name}
          </Text>
          {required.length > 0 ? (
            <Text step="caption" tone={complete ? 'positive' : 'negative'}>
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
                    <Pressable
                      key={opt}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${spec.label}: ${opt}`}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => undefined);
                        onAnswer(spec.key, on && spec.type === 'confirm' ? undefined : value);
                      }}
                      style={{
                        height: 44,
                        paddingHorizontal: 14,
                        borderRadius: radius.md,
                        borderWidth: 1.5,
                        borderColor: on ? c.accent : c.divider,
                        backgroundColor: on ? c.accent : c.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text step="label" style={{ color: on ? c.onAccent : c.textPrimary }}>
                        {spec.type === 'confirm' && on ? '✓ Done' : opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ChipEdge() {
  const { c } = useTheme();
  return (
    <View style={{ height: 4, flexDirection: 'row', overflow: 'hidden' }}>
      {Array.from({ length: 40 }, (_, i) => (
        <View key={i} style={{ width: i % 2 === 0 ? 12 : 8, backgroundColor: i % 2 === 0 ? c.accent : c.divider }} />
      ))}
    </View>
  );
}
