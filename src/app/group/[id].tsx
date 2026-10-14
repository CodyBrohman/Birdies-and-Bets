import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { confirm, FormRow, ListItem, ListSection, SheetScreen } from '@/components/ui';
import { useMe, useProfileStore } from '@/store';
import { MAX_GROUP_SIZE, MAX_PROFILE_NAME, MIN_GROUP_SIZE } from '@/lib/profiles';

/** A group of two to four you play with, to fill a round in one tap. `new` makes one; an id edits it. */
export default function GroupSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groups = useProfileStore((s) => s.groups);
  const profiles = useProfileStore((s) => s.profiles);
  const saveGroup = useProfileStore((s) => s.saveGroup);
  const removeGroup = useProfileStore((s) => s.removeGroup);
  const { me } = useMe();
  const existing = groups.find((g) => g.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [memberIds, setMemberIds] = useState<string[]>(existing?.memberIds ?? (me ? [me.id] : []));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/friends'));
  const valid = name.trim().length > 0 && memberIds.length >= MIN_GROUP_SIZE;

  const toggle = (pid: string) => {
    const has = memberIds.includes(pid);
    if (!has && memberIds.length >= MAX_GROUP_SIZE) return;
    setMemberIds(has ? memberIds.filter((m) => m !== pid) : [...memberIds, pid]);
  };
  const save = () => {
    if (!valid) return;
    if (saveGroup({ id: existing?.id, name, memberIds })) close();
  };
  const del = async () => {
    if (!existing) return;
    if (!(await confirm({ title: `Delete ${existing.name}?`, message: 'The players stay saved; only the group goes.', confirmLabel: 'Delete group', destructive: true }))) return;
    removeGroup(existing.id);
    close();
  };

  return (
    <SheetScreen title={existing ? 'Edit group' : 'New group'} onClose={close} action={{ label: 'Save', onPress: save, disabled: !valid }}>
      <ListSection>
        <FormRow label="Name" placeholder="e.g. Saturday group" value={name} onChangeText={setName} maxLength={MAX_PROFILE_NAME} autoCapitalize="words" accessibilityLabel="Group name" />
      </ListSection>
      <ListSection header={`Players · ${memberIds.length} of ${MAX_GROUP_SIZE}`} footer={`${MIN_GROUP_SIZE} to ${MAX_GROUP_SIZE} players.`}>
        {profiles.map((p) => {
          const on = memberIds.includes(p.id);
          return <ListItem key={p.id} title={p.id === me?.id ? `${p.name} (you)` : p.name} accessory={on ? 'check' : 'none'} selected={on} disabled={!on && memberIds.length >= MAX_GROUP_SIZE} onPress={() => toggle(p.id)} />;
        })}
      </ListSection>
      {existing ? (
        <ListSection>
          <ListItem title="Delete group" destructive onPress={() => void del()} />
        </ListSection>
      ) : null}
    </SheetScreen>
  );
}
