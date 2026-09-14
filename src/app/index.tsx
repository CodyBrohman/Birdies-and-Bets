import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Sheet, Text } from '@/components/ui';
import { BrandMark } from '@/components/BrandMark';
import { useTheme } from '@/theme';
import { useRoundStore } from '@/store';
import { joinMeta } from '@/lib/format';

/** Home. Start Round dominates; an in-progress round is resumable in one tap. */
export default function Home() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const round = useRoundStore((s) => s.round);
  const discardRound = useRoundStore((s) => s.discardRound);
  const hydrateError = useRoundStore((s) => s.hydrateError);
  const [confirmNew, setConfirmNew] = useState(false);

  const inProgress = round && round.status === 'in-progress' ? round : null;
  const tee = inProgress?.course.teeBoxes.find((t) => t.id === inProgress.teeBoxId);

  const startNew = () => {
    if (inProgress) {
      setConfirmNew(true);
      return;
    }
    router.push('/new-round/course');
  };

  return (
    <Screen style={{ paddingHorizontal: space[5] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[5] }}>
        <BrandMark size={40} />
        <Text step="display">Birdies & Bets</Text>
      </View>

      {inProgress ? (
        <View style={{ flex: 1, justifyContent: 'flex-end', gap: space[2], paddingBottom: space[5] }}>
          <Text step="label" tone="secondary">
            In progress
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resume round"
            onPress={() => router.push('/round/play')}
            style={({ pressed }) => ({
              backgroundColor: pressed ? c.accentTint : c.surfaceRaised,
              borderColor: pressed ? c.accent : c.divider,
              borderWidth: 1,
              borderRadius: radius.lg,
              paddingTop: 18,
              paddingHorizontal: 18,
              paddingBottom: 16,
              gap: space[2],
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] }}>
              <Text step="title" style={{ flex: 1 }} numberOfLines={1}>
                {inProgress.course.name}
              </Text>
              <View style={{ backgroundColor: c.accentTint, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10 }}>
                <Text step="label" tone="accent">
                  Hole {inProgress.currentHole} of {inProgress.settings.holeCount}
                </Text>
              </View>
            </View>
            <Text step="label" tone="secondary">
              {joinMeta([tee ? `${tee.name} tees` : null, `${inProgress.players.length} players`, `${inProgress.games.length} games`])}
            </Text>
            <Text step="bodyStrong">Resume round ›</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[2] }}>
          <BrandMark size={96} />
          <Text step="displayXl" align="center" style={{ fontSize: 34, lineHeight: 38 }}>
            Three friends, one tee time.
          </Text>
          <Text tone="secondary" align="center">
            Skins, match play, wolf, hot seat — pick your games and we keep the math straight so the parking lot stays
            friendly.
          </Text>
        </View>
      )}

      <View style={{ paddingBottom: space[5], gap: space[2] }}>
        {hydrateError ? (
          <Text step="caption" tone="negative" tabular={false} align="center">
            {hydrateError}
          </Text>
        ) : null}
        <Button label="Start Round" onPress={startNew} />
      </View>

      <Sheet visible={confirmNew} onClose={() => setConfirmNew(false)} title="Start a new round?" subtitle="The round in progress will be discarded.">
        <View style={{ gap: space[2] }}>
          <Button
            label="Discard and start new"
            onPress={() => {
              discardRound();
              setConfirmNew(false);
              router.push('/new-round/course');
            }}
          />
          <Button label="Keep playing" variant="secondary" onPress={() => setConfirmNew(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
