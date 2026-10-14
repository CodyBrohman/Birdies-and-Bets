import { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Button, ListItem, ListSection, SheetScreen, Text, TextField } from '@/components/ui';
import { IndexField } from '@/components/IndexField';
import { useTheme } from '@/theme';
import { groupAsCrew, inCrew, MAX_PLAYERS, toggleCrew, useMe, useProfileStore, useRoundStore } from '@/store';
import { formatIndex, joinMeta } from '@/lib/format';
import { MAX_PROFILE_NAME } from '@/lib/profiles';
import type { PlayerProfile } from '@/types';

/**
 * Who plays in the round being set up: you and your friends (tap to add or take out, up to four), a saved group in one
 * tap, or someone new (name and handicap index, saved as a friend).
 */
export default function PlayersSheet() {
  const router = useRouter();
  const { space } = useTheme();
  const players = useRoundStore((s) => s.draft.players).filter((p) => p.name.trim());
  const groups = useProfileStore((s) => s.groups);
  const profiles = useProfileStore((s) => s.profiles);
  const addProfile = useProfileStore((s) => s.addProfile);
  const { me, friends } = useMe();
  const [full, setFull] = useState(false);
  const [name, setName] = useState('');
  const [index, setIndex] = useState<number | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/play'));
  const toggle = (p: PlayerProfile) => setFull(!toggleCrew(p));
  const addNew = () => {
    if (!name.trim()) return;
    const profile = addProfile(name, index);
    Keyboard.dismiss();
    setFull(!toggleCrew(profile));
    setName('');
    setIndex(undefined);
    setFormKey((k) => k + 1);
  };
  const people = [...(me ? [me] : []), ...friends];
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name;

  return (
    <SheetScreen title="Players" onClose={close}>
      <Text step="subhead" tone={full ? 'negative' : 'secondary'} accessibilityLiveRegion="polite">
        {full ? 'Four is a full group. Take someone out first.' : `${players.length} of ${MAX_PLAYERS} in the round`}
      </Text>

      {people.length > 0 ? (
        <ListSection header="Friends">
          {people.map((p) => {
            const on = inCrew(players, p.id);
            return (
              <ListItem
                key={p.id}
                title={p.id === me?.id ? `${p.name} (you)` : p.name}
                subtitle={p.handicapIndex != null ? `HCP ${formatIndex(p.handicapIndex)}` : 'No handicap'}
                leading={<Avatar name={p.name} size={36} />}
                accessory={on ? 'check' : 'none'}
                selected={on}
                accessibilityLabel={`${p.name}${on ? ', in the round' : ''}`}
                accessibilityHint={on ? 'Takes them out of the round' : 'Adds them to the round'}
                onPress={() => toggle(p)}
              />
            );
          })}
        </ListSection>
      ) : null}

      {groups.length > 0 ? (
        <ListSection header="Groups" footer="Choosing a group replaces the players with its members.">
          {groups.map((g) => (
            <ListItem
              key={g.id}
              title={g.name}
              subtitle={joinMeta(g.memberIds.map(nameOf))}
              onPress={() => {
                groupAsCrew(g.memberIds);
                close();
              }}
            />
          ))}
        </ListSection>
      ) : null}

      <ListSection header="Someone new" footer="Saved as a friend on this phone. Leave the index blank to play without a handicap.">
        <View key={formKey} style={{ flexDirection: 'row', gap: space[3], padding: space[3] }}>
          <TextField style={{ flex: 1 }} placeholder="Name" value={name} maxLength={MAX_PROFILE_NAME} autoCapitalize="words" onChangeText={setName} accessibilityLabel="New player's name" returnKeyType="done" onSubmitEditing={addNew} testID="friend-name" />
          <IndexField value={index} onChange={setIndex} label="New player's handicap index" style={{ height: 50 }} />
        </View>
      </ListSection>
      <Button label="Add player" variant="secondary" disabled={!name.trim()} onPress={addNew} testID="save-friend" />
    </SheetScreen>
  );
}
