import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Chip, Segmented, Sheet, Stepper, Text, TextField, Toggle, Pressable } from '@/components/ui';
import { useTheme } from '@/theme';
import type { ActiveGame, ConfigField, GameMode, Player, ScoringBasis } from '@/types';
import { isSymbolLabel } from '@/lib/format';
import { participantCountOf } from '@/store';

export interface GameConfigSheetProps {
  mode: GameMode | null;
  active: ActiveGame | null;
  players: Player[];
  stakeLabel: string;
  onChange: (next: ActiveGame) => void;
  onClose: () => void;
}

/** Players taking part in this game: the chosen subset, or everyone. */
function participantsFor(active: ActiveGame, players: Player[]): Player[] {
  return active.playerIds ? players.filter((p) => active.playerIds!.includes(p.id)) : players;
}

/**
 * Renders a game's declared config fields generically: number steppers, toggles, choices, lists,
 * plus the gross/net basis and a participant picker when the game needs a fixed number of players.
 * No branching on game id anywhere.
 */
export function GameConfigSheet({ mode, active, players, stakeLabel, onChange, onClose }: GameConfigSheetProps) {
  const { space } = useTheme();
  if (!mode || !active) return <Sheet visible={false} onClose={onClose} children={null} />;

  const count = participantCountOf(mode, active);
  const set = (key: string, value: string | number | boolean | string[]) => {
    const next: ActiveGame = { ...active, config: { ...active.config, [key]: value } };
    // A format that means everyone plays drops the picked subset; one that needs a pick leaves it to the user.
    if (participantCountOf(mode, next) === undefined) delete next.playerIds;
    onChange(next);
  };
  const setBasis = (basis: ScoringBasis) => onChange({ ...active, basis });
  const toggleParticipant = (id: string) => {
    const current = active.playerIds ?? [];
    const n = count ?? players.length;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(-n);
    onChange({ ...active, playerIds: next });
  };

  return (
    <Sheet visible onClose={onClose} title={mode.name} subtitle={mode.blurb} actionLabel="Done">
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: space[2] }}>
        {count ? (
          <Row label={`Pick ${count} players`} help={`${(active.playerIds ?? []).length} of ${count} chosen`}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'flex-end', maxWidth: 200 }}>
              {players.map((p) => (
                <Chip key={p.id} label={p.name} selected={(active.playerIds ?? []).includes(p.id)} onPress={() => toggleParticipant(p.id)} />
              ))}
            </View>
          </Row>
        ) : null}

        {mode.configFields
          .filter((f) => !(f.requiresPlayers && players.length < f.requiresPlayers) && !(f.showWhen && (active.config[f.showWhen.key] ?? mode.configFields.find((x) => x.key === f.showWhen!.key)?.default) !== f.showWhen.equals))
          .map((f) => (
          <Row key={f.key} label={f.label} help={f.help}>
            <Field field={f} value={active.config[f.key] ?? f.default} onChange={(v) => set(f.key, v)} unitLabel={f.key === 'stake' ? stakeLabel : undefined} players={participantsFor(active, players)} />
          </Row>
          ))}

        {mode.supportsNet ? (
          <Row label="Scoring" help={active.basis === 'net' ? 'Handicap strokes applied' : 'Strokes as played'}>
            <Segmented
              compact
              options={[
                { value: 'net', label: 'Net' },
                { value: 'gross', label: 'Gross' },
              ]}
              value={active.basis}
              onChange={setBasis}
              accessibilityLabel={`${mode.name} scoring basis`}
            />
          </Row>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

function Row({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  const { c, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: c.dividerSoft }}>
      <View style={{ flex: 1 }}>
        <Text step="bodyStrong">{label}</Text>
        {help ? (
          <Text step="caption" tone="secondary" tabular={false}>
            {help}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Field({ field, value, onChange, unitLabel, players }: { field: ConfigField; value: unknown; onChange: (v: string | number | boolean | string[]) => void; unitLabel?: string; players: Player[] }) {
  switch (field.type) {
    case 'teams': {
      const a = Array.isArray(value) ? (value as string[]) : [];
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 200 }}>
          {players.map((p) => (
            <Chip key={p.id} label={p.name} selected={a.includes(p.id)} onPress={() => onChange(a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id].slice(-field.teamSize))} />
          ))}
        </View>
      );
    }
    case 'number':
      return (
        <View style={{ width: 168 }}>
          <Stepper
            value={Number(value)}
            min={field.min ?? 0}
            max={field.max ?? 999}
            step={field.step ?? 1}
            prefix={unitLabel && isSymbolLabel(unitLabel) ? unitLabel : undefined}
            suffix={unitLabel ? (isSymbolLabel(unitLabel) ? undefined : unitLabel === 'points' ? 'pts' : unitLabel) : field.unit}
            onChange={onChange}
            accessibilityLabel={field.label}
          />
        </View>
      );
    case 'boolean':
      return <Toggle value={!!value} onChange={onChange} accessibilityLabel={field.label} />;
    case 'choice':
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 200 }}>
          {field.options.map((o) => (
            <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
          ))}
        </View>
      );
    case 'list':
      return <ListField value={Array.isArray(value) ? (value as string[]) : field.default} onChange={onChange} label={field.label} />;
  }
}

/** Editable list of short strings (punishments). Tap an item to remove it; type to add. */
function ListField({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  const { c, radius, space } = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const s = draft.trim();
    if (!s) return;
    onChange([...value, s]);
    setDraft('');
  };
  return (
    <View style={{ flex: 1, gap: space[2], maxWidth: 240 }}>
      {value.map((item, i) => (
        <Pressable
          key={`${item}-${i}`}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item}`}
          onPress={() => onChange(value.filter((_, j) => j !== i))}
          style={({ pressed }) => ({
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[2],
            paddingHorizontal: space[4],
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: c.divider,
            backgroundColor: pressed ? c.surfaceRaised : c.surface,
          })}
        >
          <Text step="caption" tone="tertiary">
            {i + 1}
          </Text>
          <Text step="label" style={{ flex: 1 }} numberOfLines={2}>
            {item}
          </Text>
          <Ionicons name="close" size={16} color={c.textSecondary} />
        </Pressable>
      ))}
      <TextField placeholder={`Add a ${label.toLowerCase().replace(/s$/, '')}`} value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" accessibilityLabel={`Add ${label}`} />
    </View>
  );
}
