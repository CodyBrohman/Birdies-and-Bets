import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, Button, Card, Chip, IconButton, IconTile, ListRow, Screen, ScreenHeader, SectionLabel, Sheet, Text, TextField } from '@/components/ui';
import { AddFriendSheet } from '@/components/AddFriendSheet';
import { useTheme } from '@/theme';
import { groupAsCrew, inCrew, rematch, toggleCrew, useHistoryStore, useMe, useProfileStore, useRoundStore } from '@/store';
import type { HistoryEntry, Round } from '@/types';
import { formatIndex, formatShortDate, joinMeta } from '@/lib/format';
import { groupMembers, MAX_GROUP_SIZE, MAX_PROFILE_NAME, MIN_GROUP_SIZE } from '@/lib/profiles';
import { dayLabel, formatSlot, parseTeeTime } from '@/lib/teeTime';

type GroupDraft = { id?: string; name: string; memberIds: string[] };

/** Friends: your circle, the rounds you've played together, and everyone you can add to the next round. */
export default function FriendsScreen() {
  const router = useRouter();
  const { c, f, space, layout } = useTheme();
  const { me, friends } = useMe();
  const entries = useHistoryStore((s) => s.entries);
  const round = useRoundStore((s) => s.round);
  const draftPlayers = useRoundStore((s) => s.draft.players);
  const draftCourse = useRoundStore((s) => s.draft.course);
  const teeTime = useRoundStore((s) => s.draft.settings.teeTime);
  const groups = useProfileStore((s) => s.groups);
  const saveGroup = useProfileStore((s) => s.saveGroup);
  const removeGroup = useProfileStore((s) => s.removeGroup);
  const allProfiles = useProfileStore((s) => s.profiles);
  const [adding, setAdding] = useState(false);
  const [group, setGroup] = useState<GroupDraft | null>(null);

  const live = round && round.status === 'in-progress' ? round : null;
  const past: HistoryEntry[] = entries.filter((e) => e.round).slice(0, live ? 1 : 2);
  const now = new Date();
  const tee = parseTeeTime(teeTime);
  const lastPlayed = (iso?: string) => (iso ? `Played ${formatShortDate(iso)}` : 'Open to play');

  const toggleMember = (id: string) => {
    if (!group) return;
    const has = group.memberIds.includes(id);
    if (!has && group.memberIds.length >= MAX_GROUP_SIZE) return;
    setGroup({ ...group, memberIds: has ? group.memberIds.filter((m) => m !== id) : [...group.memberIds, id] });
  };
  const groupValid = !!group && group.name.trim().length > 0 && group.memberIds.length >= MIN_GROUP_SIZE;

  return (
    <Screen noBottomInset>
      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingTop: space[6], paddingBottom: layout.section }} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Your golf circle" title="Good golf is better together." subtitle="See who you play with and line up your next foursome." style={{ marginBottom: space[2] }} />

        <Card variant="hero" onPress={() => setAdding(true)} accessibilityLabel="Build your golf circle: add a friend" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[5] }}>
          <IconTile icon="people-outline" tone="hero" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text step="title" style={{ color: c.onHero }}>
              Build your golf circle
            </Text>
            <Text step="caption" tabular={false} style={{ color: c.onHeroSoft }}>
              Add your regulars for the next round.
            </Text>
          </View>
          <Ionicons name="arrow-up-outline" size={20} color={c.onHero} style={{ transform: [{ rotate: '45deg' }] }} />
        </Card>

        <SectionLabel style={{ marginTop: layout.section - layout.stack }}>Rounds in your circle</SectionLabel>
        {live ? <RoundCard round={live} status="Playing now" when={`Hole ${live.currentHole} · in play`} primary={{ label: 'Open round', onPress: () => router.push('/round/play') }} /> : null}
        {!live && draftCourse && draftPlayers.some((p) => p.name.trim()) ? (
          <CircleCard
            names={draftPlayers.filter((p) => p.name.trim()).map((p) => p.name)}
            status="Coming up"
            dot="gold"
            course={draftCourse.name}
            when={tee ? `${dayLabel(tee.day, now)} · ${formatSlot(tee.slot)}` : 'Tee time to pick'}
            primary={{ label: 'Finish setup', onPress: () => router.navigate('/bet') }}
          />
        ) : null}
        {past.map((e) => (
          <RoundCard
            key={e.summary.id}
            round={e.round!}
            status={`Played ${formatShortDate(e.summary.completedAt)}`}
            dot="gold"
            when={joinMeta([e.summary.players.find((p) => p.id === e.summary.leaderId)?.name ? `${e.summary.players.find((p) => p.id === e.summary.leaderId)!.name} led` : null, ...e.summary.gameNames])}
            primary={{ label: 'View round', onPress: () => router.push({ pathname: '/history/[id]', params: { id: e.summary.id } }) }}
            secondary={{
              label: 'Rematch',
              onPress: () => {
                rematch(e.round!);
                router.navigate('/bet');
              },
            }}
          />
        ))}
        {!live && past.length === 0 && !draftCourse ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconTile icon="golf-outline" />
            <View style={{ flex: 1 }}>
              <Text step="title">No rounds together yet</Text>
              <Text step="caption" tone="tertiary" tabular={false}>
                Finished rounds show up here with a rematch button.
              </Text>
            </View>
          </Card>
        ) : null}

        <SectionLabel action={{ label: 'Add friend', onPress: () => setAdding(true) }} style={{ marginTop: layout.section - layout.stack }}>
          Your golf friends
        </SectionLabel>
        {friends.length === 0 ? (
          <Card onPress={() => setAdding(true)} accessibilityLabel="Add your first friend" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconTile icon="person-add-outline" />
            <View style={{ flex: 1 }}>
              <Text step="title">Nobody here yet</Text>
              <Text step="caption" tone="tertiary" tabular={false}>
                Players from your rounds are saved here too.
              </Text>
            </View>
          </Card>
        ) : (
          <Card padding="none" style={{ paddingHorizontal: space[4] }}>
            {friends.map((p, i) => {
              const on = inCrew(draftPlayers, p.id);
              return (
                <ListRow
                  key={p.id}
                  divider={i > 0}
                  leading={<Avatar name={p.name} index={i} size={40} />}
                  title={p.name}
                  meta={joinMeta([p.handicapIndex != null ? `HCP ${formatIndex(p.handicapIndex)}` : 'Scratch', lastPlayed(p.lastPlayedAt)])}
                  onPress={() => router.push({ pathname: '/friends/[id]', params: { id: p.id } })}
                  accessibilityLabel={`${p.name}, details`}
                  action={<IconButton variant="tinted" icon={on ? 'checkmark' : 'add'} color={on ? c.accentText : c.textPrimary} label={on ? `Remove ${p.name} from the next round` : `Add ${p.name} to the next round`} onPress={() => toggleCrew(p)} />}
                />
              );
            })}
          </Card>
        )}

        {friends.length >= MIN_GROUP_SIZE || groups.length ? (
          <>
            <SectionLabel action={{ label: 'New group', onPress: () => setGroup({ name: '', memberIds: me ? [me.id] : [] }) }} sub="Fill the whole crew in one tap." style={{ marginTop: layout.section - layout.stack }}>
              Your groups
            </SectionLabel>
            {groups.map((g) => {
              const members = groupMembers(g, allProfiles);
              return (
                <Card key={g.id} padding="none" style={{ paddingHorizontal: space[4] }}>
                  <ListRow
                    leading={<IconTile icon="people-outline" />}
                    title={g.name}
                    meta={members.map((m) => m.name).join(' · ')}
                    onPress={() => setGroup({ id: g.id, name: g.name, memberIds: g.memberIds })}
                    accessibilityLabel={`Edit group ${g.name}`}
                    action={
                      <Button
                        label="Play"
                        size="sm"
                        variant="tinted"
                        onPress={() => {
                          groupAsCrew(g.memberIds);
                          router.navigate('/bet');
                        }}
                      />
                    }
                  />
                </Card>
              );
            })}
          </>
        ) : null}

        <Card variant="tinted" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3], paddingVertical: space[5] }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text step="title">Your next tee time is waiting.</Text>
            <Text step="caption" tone="secondary" tabular={false}>
              Choose a course and invite your crew.
            </Text>
          </View>
          <Button label="Plan a round" size="md" icon="arrow-forward" onPress={() => router.navigate('/bet')} />
        </Card>
      </ScrollView>

      <AddFriendSheet visible={adding} onClose={() => setAdding(false)} />

      <Sheet visible={group != null} onClose={() => setGroup(null)} title={group?.id ? 'Edit group' : 'New group'} subtitle={`${MIN_GROUP_SIZE} to ${MAX_GROUP_SIZE} players`}>
        {group ? (
          <View style={{ gap: space[3] }}>
            <TextField placeholder="Group name, e.g. Saturday crew" value={group.name} maxLength={MAX_PROFILE_NAME} autoCapitalize="words" onChangeText={(name) => setGroup({ ...group, name })} accessibilityLabel="Group name" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {allProfiles.map((p) => (
                <Chip key={p.id} label={p.id === me?.id ? `${p.name} (you)` : p.name} selected={group.memberIds.includes(p.id)} onPress={() => toggleMember(p.id)} haptic={false} accessibilityLabel={`${group.memberIds.includes(p.id) ? 'Remove' : 'Add'} ${p.name}`} />
              ))}
            </View>
            <Text step="caption" tone="tertiary" tabular={false}>
              {group.memberIds.length} of {MAX_GROUP_SIZE}
            </Text>
            <Button label={group.id ? 'Save changes' : 'Save group'} disabled={!groupValid} onPress={() => saveGroup(group) && setGroup(null)} />
            {group.id ? (
              <Button
                label="Delete group"
                variant="secondary"
                destructive
                onPress={() => {
                  removeGroup(group.id!);
                  setGroup(null);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );

  function RoundCard({ round: r, ...rest }: { round: Round; status: string; dot?: 'accent' | 'gold'; when: string; primary: { label: string; onPress: () => void }; secondary?: { label: string; onPress: () => void } }) {
    const others = r.players.filter((p) => !me || p.profileId !== me.id).map((p) => p.name);
    return <CircleCard names={others.length ? others : r.players.map((p) => p.name)} course={r.course.name} {...rest} />;
  }

  function CircleCard({ names, status, dot = 'accent', course, when, primary, secondary }: { names: string[]; status: string; dot?: 'accent' | 'gold'; course: string; when: string; primary: { label: string; onPress: () => void }; secondary?: { label: string; onPress: () => void } }) {
    const title = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' & ');
    return (
      <Card style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Avatar name={names[0] ?? '?'} index={0} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text step="title" numberOfLines={1} style={{ flexShrink: 1 }}>
                {title}
              </Text>
              <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: dot === 'gold' ? c.goldFill : c.accent }} />
              <Text step="caption" tone="tertiary" tabular={false} style={{ fontSize: 12 }}>
                {status}
              </Text>
            </View>
            <Text step="caption" tone="accent" tabular={false} numberOfLines={1} style={{ fontFamily: f.uiSemibold }}>
              {course}
            </Text>
            <Text step="caption" tone="tertiary" tabular={false} numberOfLines={1} style={{ fontSize: 12 }}>
              {when}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Button label={primary.label} variant="tinted" icon="golf-outline" onPress={primary.onPress} style={{ flex: 1 }} />
          {secondary ? <Button label={secondary.label} variant="secondary" onPress={secondary.onPress} /> : null}
        </View>
      </Card>
    );
  }
}

