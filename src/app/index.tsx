import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Screen, Sheet, Text } from '@/components/ui';
import { BrandMark } from '@/components/BrandMark';
import { useTheme } from '@/theme';
import { useGameCatalog, useRoundStore } from '@/store';
import { joinMeta } from '@/lib/format';

/** Home. Start Round dominates; an in-progress round is resumable in one tap. First run gets a proper landing. */
export default function Home() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const round = useRoundStore((s) => s.round);
  const discardRound = useRoundStore((s) => s.discardRound);
  const hydrateError = useRoundStore((s) => s.hydrateError);
  const catalog = useGameCatalog();
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[5] }} accessibilityRole="header">
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
        <ScrollView contentContainerStyle={{ paddingVertical: space[6], gap: space[6] }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={{ alignItems: 'center', gap: space[3] }}>
            <BrandMark size={88} />
            <Text step="displayXl" align="center" style={{ fontSize: 34, lineHeight: 38 }}>
              The scorecard that runs the games.
            </Text>
            <Text tone="secondary" align="center">
              Keep score like a real card, then let the app keep the skins, the match and the side bets straight.
            </Text>
          </View>

          {/* What you get */}
          <View style={{ gap: space[2] }}>
            <Feature icon="grid-outline" title="A proper scorecard" body="Front and back nine, birdies and bogeys marked, strokes shown on every hole." />
            <Feature icon="trophy-outline" title="Nine games, scored live" body="Pick any mix. Standings update after every hole in each game's own words." />
            <Feature icon="calculator-outline" title="Handicaps done right" body="Enter an index, see the course handicap and exactly which holes get a stroke." />
          </View>

          {/* Game chips */}
          <View style={{ gap: space[2] }}>
            <Text step="label" tone="secondary">
              Games you can play
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {catalog.map((g) => (
                <View
                  key={g.id}
                  style={{
                    height: 36,
                    paddingHorizontal: 12,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: g.category === 'betting' ? c.accent : c.positive,
                    backgroundColor: c.surfaceRaised,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text step="label">{g.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text step="caption" tone="secondary" tabular={false} align="center">
            No account. Works offline. Points are a tally between friends; nothing is paid through the app.
          </Text>
        </ScrollView>
      )}

      <View style={{ paddingBottom: space[5], paddingTop: space[2], gap: space[2] }}>
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

function Feature({ icon, title, body }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }) {
  const { c, radius, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center', backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.divider, borderRadius: radius.lg, padding: space[3] }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={24} color={c.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text step="bodyStrong">{title}</Text>
        <Text step="caption" tone="secondary" tabular={false}>
          {body}
        </Text>
      </View>
    </View>
  );
}
