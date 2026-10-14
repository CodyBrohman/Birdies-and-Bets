import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { actionSheet, Avatar, Button, confirm, HeaderButton, ListItem, ListSection, ScrollScreen, Text } from '@/components/ui';
import { LiveRoundBanner } from '@/components/round';
import { useTheme } from '@/theme';
import { draftIsDirty, groupAsCrew, useHeadToHead, useMe, useProfileStore, type HeadToHead } from '@/store';
import { formatIndex, joinMeta, plural } from '@/lib/format';
import { formatNet } from '@/lib/stats';
import { groupMembers } from '@/lib/profiles';
import type { PlayerGroup } from '@/types';

/** A group's Play fills New round: ask first when something is already set up there. */
const confirmReplaceDraft = () => confirm({ title: 'Replace the round you are setting up?', message: 'Its players in New round are replaced by the group.', confirmLabel: 'Replace' });

/** Friends: your groups (a round in one tap) and the people you play with, each with your points against them. */
export default function FriendsScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const { friends } = useMe();
  const groups = useProfileStore((s) => s.groups);
  const profiles = useProfileStore((s) => s.profiles);
  const removeGroup = useProfileStore((s) => s.removeGroup);
  const h2h = useHeadToHead();

  const playGroup = async (g: PlayerGroup) => {
    if (draftIsDirty() && !(await confirmReplaceDraft())) return;
    groupAsCrew(g.memberIds);
    router.navigate('/play');
  };
  const deleteGroup = async (g: PlayerGroup) => {
    if (await confirm({ title: `Delete ${g.name}?`, message: 'The players stay saved; only the group goes.', confirmLabel: 'Delete group', destructive: true })) removeGroup(g.id);
  };
  const groupMenu = async (g: PlayerGroup) => {
    const items = [
      { label: 'Play with this group', run: () => void playGroup(g) },
      { label: 'Edit group', run: () => router.push({ pathname: '/group/[id]', params: { id: g.id } }) },
      { label: 'Delete group', destructive: true, run: () => void deleteGroup(g) },
    ];
    const i = await actionSheet(g.name, items);
    if (i != null) items[i]?.run();
  };
  const againstYou = (h: HeadToHead | undefined) => (h && h.pointsRounds > 0 ? `${formatNet(h.points)} pts` : undefined);

  return (
    <ScrollScreen title="Friends" largeTitle gap={space[6]} headerRight={() => <HeaderButton label="Add friend" icon="personAdd" onPress={() => router.push('/friend/add')} testID="add-friend" />}>
      <LiveRoundBanner />

      {friends.length === 0 ? (
        <View style={{ gap: space[3], paddingVertical: space[4] }}>
          <View style={{ gap: space[1] }}>
            <Text step="title3" align="center">
              No friends yet
            </Text>
            <Text step="subhead" tone="secondary" align="center">
              Players you add to a round are saved here.
            </Text>
          </View>
          <Button label="Add friend" variant="secondary" onPress={() => router.push('/friend/add')} />
        </View>
      ) : (
        <>
          <ListSection header="Groups" footer={groups.length ? 'Tap a group to play with it, edit it or delete it.' : 'Two to four players, to fill a round in one tap.'}>
            {groups.map((g) => (
              <ListItem
                key={g.id}
                title={g.name}
                strong
                subtitle={groupMembers(g, profiles)
                  .map((m) => m.name)
                  .join(', ')}
                onPress={() => void groupMenu(g)}
                accessory="none"
                accessibilityHint="Play, edit or delete"
              />
            ))}
            <ListItem title="New group" action onPress={() => router.push({ pathname: '/group/[id]', params: { id: 'new' } })} testID="new-group" />
          </ListSection>

          <ListSection header="Friends" footer="Points are your tally against each friend over every round you've played together.">
            {friends.map((p) => {
              const h = h2h.get(p.id);
              return (
                <ListItem
                  key={p.id}
                  title={p.name}
                  subtitle={joinMeta([p.handicapIndex != null ? `HCP ${formatIndex(p.handicapIndex)}` : 'No handicap', h ? `${plural(h.rounds, 'round')} together` : null])}
                  value={againstYou(h)}
                  leading={<Avatar name={p.name} size={36} />}
                  onPress={() => router.push({ pathname: '/friends/[id]', params: { id: p.id } })}
                />
              );
            })}
          </ListSection>
        </>
      )}
    </ScrollScreen>
  );
}
