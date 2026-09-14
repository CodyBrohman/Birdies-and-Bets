import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Segmented, Sheet, Text, TextField, Toggle } from '@/components/ui';
import { useTheme } from '@/theme';
import type { ActiveGame, ConfigField, GameMode, Player, ScoringBasis } from '@/types';

export interface GameConfigSheetProps {
  mode: GameMode | null;
  active: ActiveGame | null;
  players: Player[];
  stakeLabel: string;
  onChange: (next: ActiveGame) => void;
  onClose: () => void;
}

/**
 * Renders a game's declared config fields generically: number steppers, toggles, choices, lists,
 * plus the gross/net basis and a participant picker when the game needs a fixed number of players.
 * No branching on game id anywhere.
 */
/** Players taking part in this game: the chosen subset, or everyone. */
function participantsFor(active: ActiveGame, players: Player[]): Player[] {
  return active.playerIds ? players.filter((p) => active.playerIds!.includes(p.id)) : players;
}

export function GameConfigSheet({ mode, active, players, stakeLabel, onChange, onClose }: GameConfigSheetProps) {
  const { c, space } = useTheme();
  if (!mode || !active) return <Sheet visible={false} onClose={onClose} children={null} />;

  const set = (key: string, value: string | number | boolean | string[]) => onChange({ ...active, config: { ...active.config, [key]: value } });
  const setBasis = (basis: ScoringBasis) => onChange({ ...active, basis });
  const toggleParticipant = (id: string) => {
    const current = active.playerIds ?? [];
    const n = mode.participantCount ?? players.length;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(-n);
    onChange({ ...active, playerIds: next });
  };

  return (
    <Sheet visible onClose={onClose} title={mode.name} subtitle={mode.blurb} actionLabel="Done">
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: space[2] }}>
        {mode.participantCount ? (
          <Row label={`Pick ${mode.participantCount} players`} help={`${(active.playerIds ?? []).length} of ${mode.participantCount} chosen`}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'flex-end', maxWidth: 200 }}>
              {players.map((p) => (
                <Chip key={p.id} label={p.name} on={(active.playerIds ?? []).includes(p.id)} onPress={() => toggleParticipant(p.id)} />
              ))}
            </View>
          </Row>
        ) : null}

        {mode.configFields.map((f) => (
          <Row key={f.key} label={f.label} help={f.help}>
            <Field field={f} value={active.config[f.key] ?? f.default} onChange={(v) => set(f.key, v)} unitLabel={f.key === 'stake' ? stakeLabel : undefined} players={participantsFor(active, players)} />
          </Row>
        ))}

        {mode.supportsNet ? (
          <Row label="Scoring" help={active.basis === 'net' ? 'Handicap strokes applied' : 'Strokes as played'}>
            <View style={{ width: 160 }}>
              <Segmented
                options={[
                  { value: 'gross', label: 'Gross' },
                  { value: 'net', label: 'Net' },
                ]}
                value={active.basis}
                onChange={setBasis}
                accessibilityLabel={`${mode.name} scoring basis`}
              />
            </View>
          </Row>
        ) : null}
      </ScrollView>
      <View style={{ height: 1, backgroundColor: c.divider, opacity: 0 }} />
    </Sheet>
  );
}

function Row({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  const { c, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: c.divider }}>
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
            <Chip key={p.id} label={p.name} on={a.includes(p.id)} onPress={() => onChange(a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id].slice(-field.teamSize))} />
          ))}
        </View>
      );
    }
    case 'number':
      return <NumberField value={Number(value)} min={field.min ?? 0} max={field.max ?? 999} step={field.step ?? 1} unit={unitLabel ?? field.unit} onChange={onChange} label={field.label} />;
    case 'boolean':
      return <Toggle value={!!value} onChange={onChange} accessibilityLabel={field.label} />;
    case 'choice':
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 200 }}>
          {field.options.map((o) => (
            <Chip key={o.value} label={o.label} on={value === o.value} onPress={() => onChange(o.value)} />
          ))}
        </View>
      );
    case 'list':
      return <ListField value={Array.isArray(value) ? (value as string[]) : field.default} onChange={onChange} label={field.label} />;
  }
}

function NumberField({ value, min, max, step, unit, onChange, label }: { value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; label: string }) {
  const { c, radius } = useTheme();
  const btn = (glyph: string, delta: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${delta > 0 ? 'up' : 'down'}`}
      disabled={disabled}
      onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: pressed ? c.accent : c.divider,
        backgroundColor: pressed ? c.accentTint : c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Text step="headline">{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {btn('−', -step, value <= min)}
      <View style={{ minWidth: 64, alignItems: 'center' }}>
        <Text step="score" tabular style={{ fontSize: 26, lineHeight: 30 }}>
          {value}
        </Text>
        {unit ? (
          <Text step="caption" tone="secondary" tabular={false}>
            {unit}
          </Text>
        ) : null}
      </View>
      {btn('+', step, value >= max)}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
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
        {label}
      </Text>
    </Pressable>
  );
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
            paddingHorizontal: space[3],
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: pressed ? c.accent : c.divider,
            backgroundColor: pressed ? c.accentTint : c.surface,
          })}
        >
          <Text step="caption" tone="secondary">
            {i + 1}
          </Text>
          <Text step="label" style={{ flex: 1 }} numberOfLines={2}>
            {item}
          </Text>
          <Text step="label" tone="secondary">
            ✕
          </Text>
        </Pressable>
      ))}
      <TextField placeholder={`Add a ${label.toLowerCase().replace(/s$/, '')}`} value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" accessibilityLabel={`Add ${label}`} />
    </View>
  );
}
