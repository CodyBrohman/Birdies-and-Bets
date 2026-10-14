import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ask, Avatar, Button, confirm, FormRow, ListItem, ListSection, ScrollScreen, Text } from '@/components/ui';
import { RoundRow } from '@/components/round';
import { goBackOr } from '@/components/navigation';
import { useTheme } from '@/theme';
import { inCrew, toggleCrew, useHeadToHead, useHistoryInsights, useHistoryStore, useMe, useProfile, useProfileStore, useRoundStore } from '@/store';
import { formatIndex, formatShortDate, joinMeta, parseIndex, plural } from '@/lib/format';
import { formatNet } from '@/lib/stats';
import { MAX_PROFILE_NAME, roundsForProfile } from '@/lib/profiles';

/** One friend: you against them, their name and handicap index (editable), its history, your rounds together. */
export default function FriendPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { space } = useTheme();
  const profile = useProfile(id);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const removeProfile = useProfileStore((s) => s.removeProfile);
  const entries = useHistoryStore((s) => s.entries);
  const insights = useHistoryInsights();
  const draftPlayers = useRoundStore((s) => s.draft.players);
  const h2h = useHeadToHead();
  const { me } = useMe();
  const meRef = useMemo(() => (me ? { id: me.id, name: me.name } : undefined), [me]);
  const rounds = useMemo(() => (profile ? roundsForProfile(profile, entries) : []), [profile, entries]);

  if (!profile) {
    return (
      <ScrollScreen title="Friend">
        <Text step="rowBody" tone="secondary">
          That player is no longer saved.
        </Text>
      </ScrollScreen>
    );
  }
  const isMe = profile.id === me?.id;
  const first = profile.name.trim().split(/\s+/)[0] ?? profile.name;
  const h = h2h.get(profile.id);
  const together = new Set(rounds.map((r) => r.summary.id));
  const roundRows = insights.filter((i) => together.has(i.summary.id));
  const history = [...profile.indexHistory].reverse();

  const play = async () => {
    if (!inCrew(draftPlayers, profile.id) && !toggleCrew(profile)) {
      const go = await ask('Four is a full group', `Take someone out of New round to make room for ${first}.`, [
        { label: 'Cancel', value: false, style: 'cancel' },
        { label: 'Open New round', value: true },
      ]);
      if (!go) return;
    }
    router.navigate('/play');
  };
  const del = async () => {
    if (!(await confirm({ title: `Delete ${profile.name}?`, message: 'Finished rounds are kept. Their index history goes.', confirmLabel: 'Delete player', destructive: true }))) return;
    removeProfile(profile.id);
    goBackOr('/friends');
  };

  return (
    <ScrollScreen title={profile.name} gap={space[6]} footer={isMe ? undefined : <Button label={`Play with ${first}`} onPress={() => void play()} testID="play-with" />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        <Avatar name={profile.name} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" step="title2" numberOfLines={2}>
            {profile.name}
          </Text>
          <Text step="subhead" tone="secondary">
            {joinMeta([profile.handicapIndex != null ? `HCP ${formatIndex(profile.handicapIndex)}` : 'No handicap', profile.lastPlayedAt ? `last played ${formatShortDate(profile.lastPlayedAt)}` : null])}
          </Text>
        </View>
      </View>

      {!isMe && h ? (
        <ListSection header={`You and ${first}`} footer={h.pointsRounds ? (h.points === 0 ? 'Even on points.' : h.points > 0 ? `You are up ${h.points} pts on ${first}.` : `${first} is up ${-h.points} pts on you.`) : 'No points games together yet.'}>
          <ListItem title="Rounds together" value={String(h.rounds)} />
          {h.pointsRounds ? <ListItem title="Points" value={`${formatNet(h.points)} pts`} /> : null}
        </ListSection>
      ) : null}

      <ListSection header="Details">
        <FormRow label="Name" defaultValue={profile.name} maxLength={MAX_PROFILE_NAME} autoCapitalize="words" returnKeyType="done" onEndEditing={(e) => updateProfile(profile.id, { name: e.nativeEvent.text })} accessibilityLabel="Name" />
        <FormRow
          label="Handicap"
          placeholder="No handicap"
          defaultValue={profile.handicapIndex != null ? formatIndex(profile.handicapIndex) : ''}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          maxLength={5}
          returnKeyType="done"
          onEndEditing={(e) => updateProfile(profile.id, { handicapIndex: parseIndex(e.nativeEvent.text) })}
          accessibilityLabel="Handicap index"
        />
      </ListSection>

      {history.length > 0 ? (
        <ListSection header="Index history">
          {history.map((entry, i) => {
            const prev = history[i + 1];
            const delta = prev && prev.index != null && entry.index != null ? Math.round((entry.index - prev.index) * 10) / 10 : null;
            return (
              <ListItem
                key={`${entry.at}-${i}`}
                title={entry.index == null ? 'No handicap' : formatIndex(entry.index)}
                subtitle={delta ? (delta < 0 ? `Down ${Math.abs(delta).toFixed(1)}` : `Up ${delta.toFixed(1)}`) : undefined}
                value={formatShortDate(entry.at)}
              />
            );
          })}
        </ListSection>
      ) : null}

      {roundRows.length > 0 ? (
        <ListSection header={isMe ? 'Your rounds' : 'Rounds together'} headerVariant="large" footer={plural(roundRows.length, 'round')}>
          {roundRows.map((i) => (
            <RoundRow key={i.summary.id} insight={i} me={meRef} onPress={() => router.push({ pathname: '/history/[id]', params: { id: i.summary.id } })} />
          ))}
        </ListSection>
      ) : null}

      {!isMe ? (
        <ListSection>
          <ListItem title="Delete player" destructive onPress={() => void del()} />
        </ListSection>
      ) : null}
    </ScrollScreen>
  );
}
