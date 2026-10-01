import { useMemo, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, Screen, SectionLabel, Sheet, Text, TextField, Pressable } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { goBackOr } from '@/components/navigation';
import { IndexField } from '@/components/IndexField';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme';
import { useHistoryStore, useProfile, useProfileStore } from '@/store';
import { formatIndex, formatShortDate, formatSigned, formatToPar, joinMeta, plural } from '@/lib/format';
import { MAX_PROFILE_NAME, roundsForProfile } from '@/lib/profiles';

/** One saved player: name, current index, every index change, and the rounds they played here. */
export default function ProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, space } = useTheme();
  const profile = useProfile(id);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const removeProfile = useProfileStore((s) => s.removeProfile);
  const entries = useHistoryStore((s) => s.entries);
  const rounds = useMemo(() => (profile ? roundsForProfile(profile, entries) : []), [profile, entries]);
  const [confirm, setConfirm] = useState(false);

  if (!profile) {
    return (
      <Screen>
        <SetupHeader title="Player" fallback="/friends" />
        <Text tone="secondary">That player is no longer saved.</Text>
      </Screen>
    );
  }
  const history = [...profile.indexHistory].reverse();

  return (
    <Screen>
      <SetupHeader fallback="/friends" title={profile.name} subtitle={profile.lastPlayedAt ? `Last played ${formatShortDate(profile.lastPlayedAt)}` : 'Not played yet'} />
      <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[6] }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card padding="roomy">
          <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
            <Avatar name={profile.name} index={0} size={44} />
            <TextField
              style={{ flex: 1, minWidth: 0, height: 52 }}
              defaultValue={profile.name}
              maxLength={MAX_PROFILE_NAME}
              autoCapitalize="words"
              returnKeyType="done"
              onEndEditing={(e) => updateProfile(profile.id, { name: e.nativeEvent.text })}
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel="Player name"
            />
            <IndexField value={profile.handicapIndex} onChange={(handicapIndex) => updateProfile(profile.id, { handicapIndex })} label="Handicap index" commitOnBlur />
          </View>
        </Card>

        <SectionLabel style={{ marginTop: space[3] }}>Index history</SectionLabel>
        {history.length === 0 ? (
          <Text step="body" tone="secondary">
            No index recorded yet.
          </Text>
        ) : (
          <Card variant="outlined" padding="roomy">
            {history.map((h, i) => {
              const prev = history[i + 1];
              const delta = prev && prev.index != null && h.index != null ? Math.round((h.index - prev.index) * 10) / 10 : null;
              return (
                <View key={`${h.at}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], borderBottomWidth: i === history.length - 1 ? 0 : 1, borderBottomColor: c.dividerSoft }}>
                  <Text step="body" tone="secondary" style={{ flex: 1 }}>
                    {formatShortDate(h.at)}
                  </Text>
                  {delta != null && delta !== 0 ? (
                    <Badge label={delta < 0 ? `▼ ${Math.abs(delta).toFixed(1)}` : `▲ ${delta.toFixed(1)}`} tone={delta < 0 ? 'positive' : 'neutral'} text="label" />
                  ) : null}
                  <Text step="bodyStrong" tabular>
                    {h.index == null ? 'Scratch' : formatIndex(h.index)}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        <SectionLabel style={{ marginTop: space[3] }}>Rounds</SectionLabel>
        {rounds.length === 0 ? (
          <EmptyState icon="flag-outline" title="No finished rounds yet." />
        ) : (
          rounds.map(({ summary, player }) => (
            <Pressable key={summary.id} accessibilityRole="button" accessibilityLabel={`${summary.courseName}, ${formatShortDate(summary.completedAt)}, ${player.gross}`} onPress={() => router.push({ pathname: '/history/[id]', params: { id: summary.id } })}>
              <Card variant="outlined">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text step="bodyStrong" numberOfLines={1}>
                      {summary.courseName}
                    </Text>
                    <Text step="caption" tone="secondary" tabular={false}>
                      {joinMeta([formatShortDate(summary.completedAt), summary.teeName ? `${summary.teeName} tees` : null, `${summary.holeCount} holes`, player.playingHandicap ? `${formatSigned(player.playingHandicap)} strokes` : null])}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text step="title" tabular>
                      {player.gross}
                    </Text>
                    <Text step="caption" tone="secondary" tabular>
                      {formatToPar(player.grossToPar)}
                      {player.playingHandicap ? ` · net ${player.net}` : ''}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))
        )}
        {rounds.length > 0 ? (
          <Text step="caption" tone="tertiary" tabular={false}>
            {plural(rounds.length, 'round')} on this phone.
          </Text>
        ) : null}

        <Button label="Delete player" variant="secondary" destructive style={{ marginTop: space[3] }} onPress={() => setConfirm(true)} />
      </ScrollView>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={`Delete ${profile.name}?`} subtitle="Finished rounds are kept">
        <View style={{ gap: space[2] }}>
          <Text tone="secondary">Their index history goes too.</Text>
          <Button
            label="Delete player"
            onPress={() => {
              removeProfile(profile.id);
              setConfirm(false);
              goBackOr('/friends');
            }}
          />
          <Button label="Keep" variant="secondary" onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
