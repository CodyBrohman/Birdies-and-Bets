import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { confirm, ListItem, ListSection, SegmentedControl, SheetScreen, Stepper, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { gameMeta, participantCountOf, targetFrom, useGamesTarget } from '@/store';
import type { ActiveGame, ConfigField, Player } from '@/types';
import { isSymbolLabel } from '@/lib/format';

/**
 * One game's settings, read from what the game declares (no branching on game id): who plays, its stake and options,
 * gross or net, and the rules. Edits the round being set up, or the round in progress (target=round).
 */
export default function GameSettingsSheet() {
  const router = useRouter();
  const { space } = useTheme();
  const params = useLocalSearchParams<{ gameId: string; target?: string }>();
  const target = targetFrom(params.target);
  const { players, games, settings, setGames } = useGamesTarget(target);
  const mode = gameMeta(params.gameId ?? '');
  const active = games.find((g) => g.gameId === params.gameId);
  const close = () => (router.canGoBack() ? router.back() : router.replace(target === 'round' ? '/round/play' : '/play'));
  if (!mode || !active) return null;

  const update = (next: ActiveGame) => setGames(games.map((g) => (g.gameId === next.gameId ? next : g)));
  const set = (key: string, value: string | number | boolean | string[]) => {
    const next: ActiveGame = { ...active, config: { ...active.config, [key]: value } };
    // A format that means everyone plays drops the picked subset; one that needs a pick leaves it to the person.
    if (participantCountOf(mode, next) === undefined) delete next.playerIds;
    update(next);
  };
  const count = participantCountOf(mode, active);
  const picked = active.playerIds ?? [];
  const toggleParticipant = (id: string) => {
    const n = count ?? players.length;
    update({ ...active, playerIds: picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id].slice(-n) });
  };
  const participants = active.playerIds ? players.filter((p) => active.playerIds!.includes(p.id)) : players;
  const visible = mode.configFields.filter(
    (f) => !(f.requiresPlayers && players.length < f.requiresPlayers) && !(f.showWhen && (active.config[f.showWhen.key] ?? mode.configFields.find((x) => x.key === f.showWhen!.key)?.default) !== f.showWhen.equals),
  );
  const remove = async () => {
    if (target === 'round' && !(await confirm({ title: `Remove ${mode.name}?`, message: 'Its standings go with it. You can add it again; it scores from the first hole.', confirmLabel: `Remove ${mode.name}`, destructive: true }))) return;
    setGames(games.filter((g) => g.gameId !== mode.id));
    close();
  };

  return (
    <SheetScreen title={mode.name} onClose={close}>
      <Text step="subhead" tone="secondary">
        {mode.blurb}
      </Text>

      {count ? (
        <ListSection header={`Players · pick ${count}`} footer={`${picked.length} of ${count} picked`}>
          {players.map((p) => (
            <ListItem key={p.id} title={p.name} accessory={picked.includes(p.id) ? 'check' : 'none'} selected={picked.includes(p.id)} onPress={() => toggleParticipant(p.id)} />
          ))}
        </ListSection>
      ) : null}

      {visible.map((f) => (
        <FieldSection key={f.key} field={f} value={active.config[f.key] ?? f.default} onChange={(v) => set(f.key, v)} stakeLabel={f.key === 'stake' ? settings.stakeLabel : undefined} players={participants} />
      ))}

      {mode.supportsNet ? (
        <ListSection header="Scoring" footer={active.basis === 'net' ? 'Net: handicap strokes come off before the hole is decided.' : 'Gross: strokes as played.'}>
          <View style={{ padding: space[3] }}>
            <SegmentedControl
              accessibilityLabel={`${mode.name} scoring`}
              options={[
                { value: 'net', label: 'Net' },
                { value: 'gross', label: 'Gross' },
              ]}
              value={active.basis}
              onChange={(basis) => update({ ...active, basis })}
            />
          </View>
        </ListSection>
      ) : null}

      <ListSection header="How it works">
        <Text step="subhead" tone="secondary" style={{ padding: space[4] }}>
          {mode.rules}
        </Text>
      </ListSection>

      <ListSection>
        <ListItem title={`Remove ${mode.name}`} destructive onPress={() => void remove()} />
      </ListSection>
    </SheetScreen>
  );
}

function FieldSection({ field, value, onChange, stakeLabel, players }: { field: ConfigField; value: unknown; onChange: (v: string | number | boolean | string[]) => void; stakeLabel?: string; players: Player[] }) {
  switch (field.type) {
    case 'number': {
      const symbol = stakeLabel ? isSymbolLabel(stakeLabel) : false;
      return (
        <ListSection footer={field.help}>
          <ListItem
            title={field.label}
            trailing={
              <Stepper
                value={Number(value)}
                min={field.min ?? 0}
                max={field.max ?? 999}
                step={field.step ?? 1}
                prefix={stakeLabel && symbol ? stakeLabel : undefined}
                suffix={stakeLabel ? (symbol ? undefined : stakeLabel === 'points' ? 'pts' : stakeLabel) : undefined}
                onChange={onChange}
                accessibilityLabel={field.label}
              />
            }
          />
        </ListSection>
      );
    }
    case 'boolean':
      return (
        <ListSection footer={field.help}>
          <ListItem title={field.label} accessory={{ switch: !!value, onChange }} />
        </ListSection>
      );
    case 'choice':
      return (
        <ListSection header={field.label} footer={field.help}>
          {field.options.map((o) => (
            <ListItem key={o.value} title={o.label} accessory={value === o.value ? 'check' : 'none'} selected={value === o.value} onPress={() => onChange(o.value)} />
          ))}
        </ListSection>
      );
    case 'teams': {
      const a = Array.isArray(value) ? (value as string[]) : [];
      return (
        <ListSection header={`${field.label} · pick ${field.teamSize}`} footer={field.help}>
          {players.map((p) => (
            <ListItem key={p.id} title={p.name} accessory={a.includes(p.id) ? 'check' : 'none'} selected={a.includes(p.id)} onPress={() => onChange(a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id].slice(-field.teamSize))} />
          ))}
        </ListSection>
      );
    }
    case 'list':
      return <ListFieldSection field={field} value={Array.isArray(value) ? (value as string[]) : field.default} onChange={onChange} />;
  }
}

/** An editable list of short strings (Hot seat punishments): long press an item to remove it, type to add one. */
function ListFieldSection({ field, value, onChange }: { field: Extract<ConfigField, { type: 'list' }>; value: string[]; onChange: (v: string[]) => void }) {
  const { space } = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const s = draft.trim();
    if (!s) return;
    onChange([...value, s]);
    setDraft('');
  };
  const noun = field.label.toLowerCase().replace(/s$/, '');
  return (
    <ListSection header={field.label} footer={field.help ?? 'Long press one to remove it.'}>
      {value.map((item, i) => (
        <ListItem key={`${item}-${i}`} title={item} menu={[{ label: 'Remove', destructive: true, onPress: () => onChange(value.filter((_, j) => j !== i)) }]} accessory="none" />
      ))}
      <View style={{ padding: space[3] }}>
        <TextField placeholder={`Add a ${noun}`} value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" accessibilityLabel={`Add a ${noun}`} />
      </View>
    </ListSection>
  );
}
