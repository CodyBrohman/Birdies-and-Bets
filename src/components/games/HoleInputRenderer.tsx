import { View } from 'react-native';
import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { GameMode, HoleInputSpec, HolePrompt, Player } from '@/types';

export interface HoleInputCardProps {
  mode: GameMode;
  participants: Player[];
  /** The game's line for this hole ("Cody is the wolf") and the players its player prompts leave out. */
  prompt?: HolePrompt;
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
 * A `player` answer is the player's id (two players can share a name); older rounds stored the name, which still reads.
 */
export function HoleInputCard({ mode, participants, prompt, answers, onAnswer }: HoleInputCardProps) {
  const { c, space } = useTheme();
  const specs = mode.holeInputs ?? [];
  const visible = visibleInputs(specs, answers);
  const required = visible.filter((s) => s.type !== 'confirm');
  const done = required.filter((s) => !!answers[s.key]).length;
  const complete = done === required.length;

  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, padding: space[4] }}>
      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Text accessibilityRole="header" step="rowTitle" style={{ flex: 1 }}>
            {mode.name}
          </Text>
          {required.length > 0 ? (
            <Text step="footnote" tone={complete ? 'positiveText' : 'secondary'} tabular>
              {complete ? 'Answered' : `${done} of ${required.length}`}
            </Text>
          ) : null}
        </View>
        {prompt?.note ? (
          <Text step="callout" style={{ marginTop: -space[2] }}>
            {prompt.note}
          </Text>
        ) : null}
        {visible.map((spec) => {
          const options =
            spec.type === 'player'
              ? participants.filter((p) => !prompt?.exclude?.includes(p.id)).map((p) => ({ value: p.id, label: p.name, legacy: p.name }))
              : spec.type === 'choice'
                ? spec.options.map((o) => ({ value: o, label: o, legacy: o }))
                : [{ value: 'yes', label: 'Done', legacy: 'yes' }];
          const current = answers[spec.key];
          return (
            <View key={spec.key} style={{ gap: space[2] }}>
              <Text step="subhead" tone="secondary">
                {spec.label}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                {options.map((opt) => {
                  const on = current === opt.value || (spec.type === 'player' && current === opt.legacy && !participants.some((p) => p.id === current));
                  return (
                    <Chip
                      key={opt.value}
                      label={spec.type === 'confirm' && on ? 'Done ✓' : opt.label}
                      accessibilityLabel={`${spec.label}: ${opt.label}`}
                      selected={on}
                      onPress={() => onAnswer(spec.key, on && spec.type === 'confirm' ? undefined : opt.value)}
                    />
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
