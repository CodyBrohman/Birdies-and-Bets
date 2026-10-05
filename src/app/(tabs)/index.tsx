import { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, AvatarStack, Button, Card, HeroCard, IconTile, Screen, SectionLabel, Sheet, Text, Pressable } from '@/components/ui';
import { BrandMark } from '@/components/BrandMark';
import { HERO_PHOTO, coursePhoto } from '@/components/courseArt';
import { useTheme } from '@/theme';
import { useHistoryInsights, usePlayOrder, usePreferences, useRoundStore, useMe } from '@/store';
import { holePosition, holesPlayed } from '@/lib/scoring';
import { formatIndex, formatShortDate, formatToPar, joinMeta, plural } from '@/lib/format';
import { findMe, formatNet, type RoundInsight } from '@/lib/stats';
import { stakeUnit } from '@/lib/history';
import type { PlayerProfile } from '@/types';

/** Home: greeting, the next (or live) round over a photo, handicap and circle tiles, friends and courses shortcuts. */
export default function Home() {
  const router = useRouter();
  const { c, f, space, radius, layout } = useTheme();
  const round = useRoundStore((s) => s.round);
  const draftCourse = useRoundStore((s) => s.draft.course);
  const hydrateError = useRoundStore((s) => s.hydrateError);
  const insights = useHistoryInsights();
  const onboarded = usePreferences((s) => s.onboarded);
  const prefsHydrated = usePreferences((s) => s.hydrated);
  const homeArea = usePreferences((s) => s.homeArea);
  const photoUri = usePreferences((s) => s.photoUri);
  const analyticsAsked = usePreferences((s) => s.analytics !== undefined);
  const updatePreferences = usePreferences((s) => s.update);
  const { me, friends } = useMe();
  const meRef = useMemo(() => (me ? { id: me.id, name: me.name } : undefined), [me]);

  // First launch: the tour, once. Skipping counts as seen.
  useEffect(() => {
    if (prefsHydrated && !onboarded) router.push('/onboarding');
  }, [prefsHydrated, onboarded, router]);

  const live = round && round.status === 'in-progress' ? round : null;
  const order = usePlayOrder(live);
  const position = live ? holePosition(order, live.currentHole) : 0;
  const scored = live ? holesPlayed(live.holeResults, order) : 0;

  const first = me?.name.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greetingLine = hour < 11 ? 'A good morning for an early tee time.' : hour < 17 ? 'A good day for the back nine.' : 'Still light enough for nine?';

  const hero = live
    ? {
        image: coursePhoto(live.course.id),
        pill: 'Round in progress',
        title: 'Keep the good shots coming.',
        subtitle: live.games.length ? 'Your round is underway. Keep your side games close.' : 'Your round is underway. Your card is waiting.',
        cta: { label: 'Back to your round', onPress: () => router.push('/round/play') },
      }
    : draftCourse
      ? {
          image: coursePhoto(draftCourse.id),
          pill: 'Ready when you are',
          title: `Next up at ${draftCourse.name}.`,
          subtitle: 'Build a round worth talking about.',
          cta: { label: 'Continue setup', onPress: () => router.navigate('/bet') },
        }
      : {
          image: HERO_PHOTO,
          pill: 'Ready when you are',
          title: 'Pick a course, call your crew.',
          subtitle: 'Build a round worth talking about.',
          cta: { label: 'Find a course', onPress: () => router.navigate('/courses') },
        };

  return (
    <Screen noBottomInset>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[3], paddingBottom: space[2] }}>
        <View accessible accessibilityRole="header" accessibilityLabel="Birdies and Bets" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BrandMark size={40} />
          <Text style={{ fontFamily: f.uiBold, fontSize: 18, lineHeight: 22, letterSpacing: -0.3, color: c.textPrimary }}>
            birdies <Text style={{ fontFamily: f.uiBold, fontSize: 18, color: c.accentText }}>&</Text> bets
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.navigate('/profile')} hitSlop={6}>
          <Avatar name={me?.name ?? '?'} index={0} size={44} photoUri={photoUri} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingTop: space[5], paddingBottom: layout.section }} showsVerticalScrollIndicator={false}>
        {hydrateError ? (
          <Text step="caption" tone="negative" tabular={false}>
            {hydrateError}
          </Text>
        ) : null}

        <View style={{ gap: 6, marginBottom: space[2] }}>
          <Text step="eyebrow" tone="accent">
            Your next round starts here
          </Text>
          <Text accessibilityRole="header" step="display">
            {first ? `Hey, ${first}.` : 'Hey there.'}
          </Text>
          <Text step="body" tone="tertiary">
            {greetingLine}
          </Text>
        </View>

        <HeroCard {...hero} />

        {live ? (
          <Card onPress={() => router.push('/round/play')} accessibilityLabel={`Current round at ${live.course.name}, hole ${position} of ${order.length}, ${scored} scored. Back to your round`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconTile icon="flag-outline" />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text step="eyebrow" tone="tertiary" style={{ fontSize: 10 }}>
                  Current round
                </Text>
                <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: c.accent }} />
              </View>
              <Text step="title" numberOfLines={1}>
                {live.course.name}
              </Text>
              <Text step="caption" tone="tertiary">
                {joinMeta([`Hole ${position} of ${order.length}`, `${scored} scored`])}
              </Text>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-up-outline" size={18} color={c.onAccent} style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: layout.stack }}>
          <Card onPress={() => router.navigate('/profile')} accessibilityLabel={`Handicap ${formatIndex(me?.handicapIndex)}`} style={{ flex: 1, gap: space[2], minHeight: 128 }}>
            <Text step="eyebrow" tone="tertiary">
              Handicap
            </Text>
            <Text step="score" style={{ fontSize: 30, lineHeight: 36 }}>
              {formatIndex(me?.handicapIndex)}
            </Text>
            <Text step="caption" tabular={false} tone="accent">
              {indexTrend(me)}
            </Text>
          </Card>
          <Card onPress={() => router.navigate('/friends')} accessibilityLabel={`Your circle: ${plural(friends.length, 'golf friend')}`} style={{ flex: 1, gap: space[2], minHeight: 128 }}>
            <Text step="eyebrow" tone="tertiary">
              Your circle
            </Text>
            <View style={{ minHeight: 36, justifyContent: 'center' }}>
              {friends.length ? (
                <AvatarStack names={friends.map((p) => p.name)} size={32} />
              ) : (
                <IconTile icon="person-add-outline" size={36} />
              )}
            </View>
            <Text step="caption" tone="secondary" tabular={false}>
              {friends.length ? plural(friends.length, 'golf friend') : 'Add your regulars'}
            </Text>
          </Card>
        </View>

        <SectionLabel action={{ label: 'See friends', onPress: () => router.navigate('/friends') }} style={{ marginTop: layout.section - layout.stack }}>
          A few familiar faces
        </SectionLabel>
        <Card onPress={() => router.navigate('/friends')} accessibilityLabel="Make it a group thing" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          {friends.length ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {friends.slice(0, 3).map((p, i) => (
                <Avatar key={p.id} name={p.name} index={i} size={40} />
              ))}
            </View>
          ) : (
            <IconTile icon="people-outline" />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text step="title">{friends.length ? 'Make it a group thing.' : 'Bring your regulars.'}</Text>
            <Text step="caption" tone="tertiary" tabular={false}>
              {friends.length ? 'Pick your crew for the next round.' : 'Add the people you play with most.'}
            </Text>
          </View>
          <Ionicons name="arrow-up-outline" size={20} color={c.accentText} style={{ transform: [{ rotate: '45deg' }] }} />
        </Card>

        <Card variant="tinted" onPress={() => router.navigate('/courses')} accessibilityLabel="Find your next fairway" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[2] }}>
          <IconTile icon="navigate-outline" tone="white" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text step="title">Find your next fairway</Text>
            <Text step="caption" tone="secondary" tabular={false}>
              {homeArea ? `Browse courses around ${homeArea}.` : 'Browse your courses or search for a new one.'}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={c.textPrimary} />
        </Card>

        {insights.length > 0 ? (
          <>
            <SectionLabel trailing={<Text step="caption" tone="tertiary" tabular={false}>{plural(insights.length, 'round')}</Text>} style={{ marginTop: layout.section - layout.stack }}>
              Recent rounds
            </SectionLabel>
            {insights.slice(0, 5).map((i) => (
              <PastRoundCard key={i.summary.id} insight={i} me={meRef} onPress={() => router.push({ pathname: '/history/[id]', params: { id: i.summary.id } })} />
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Once, for people who finished the intro before it asked: the anonymous-usage question. */}
      <Sheet visible={prefsHydrated && onboarded && !analyticsAsked} onClose={() => updatePreferences({ analytics: false })} title="Help make it better?" subtitle="Anonymous usage counts, your choice">
        <View style={{ gap: space[2] }}>
          <Text tone="secondary">Share counts like how many rounds get started. Never names, scores or courses. Crash reports are anonymous too. Change either one in Settings.</Text>
          <Button label="Share anonymous usage" onPress={() => updatePreferences({ analytics: true })} style={{ marginTop: space[2] }} />
          <Button label="No thanks" variant="secondary" onPress={() => updatePreferences({ analytics: false })} />
        </View>
      </Sheet>
    </Screen>
  );
}

/** "Looking sharp" when the index came down last time, "Room to grow" when it went up. */
function indexTrend(me: PlayerProfile | undefined): string {
  if (!me) return 'Set yours in Profile';
  if (me.handicapIndex == null) return 'Add your index';
  const h = me.indexHistory.filter((e) => e.index != null);
  if (h.length < 2) return 'Looking sharp';
  const [prev, last] = [h[h.length - 2]!.index!, h[h.length - 1]!.index!];
  return last < prev ? 'Looking sharp' : last > prev ? 'Room to grow' : 'Holding steady';
}

/** Course and date, the featured player's gross with its to-par, and net points. */
function PastRoundCard({ insight, me, onPress }: { insight: RoundInsight; me?: { id: string; name: string }; onPress: () => void }) {
  const { space } = useTheme();
  const { summary } = insight;
  const featured = (me && findMe(insight, me)) ?? summary.players.find((p) => p.id === summary.leaderId) ?? summary.players[0];
  const net = featured ? insight.netByPlayer[featured.id] : undefined;
  const unit = stakeUnit(insight.stakeLabel);
  const leaderName = summary.players.find((p) => p.id === summary.leaderId)?.name;
  return (
    <Card accessibilityLabel={`${summary.courseName}, ${formatShortDate(summary.completedAt)}`} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
      <IconTile icon="flag-outline" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text step="title" numberOfLines={1}>
          {summary.courseName}
        </Text>
        <Text step="caption" tone="tertiary" tabular={false} numberOfLines={1}>
          {joinMeta([formatShortDate(summary.completedAt), leaderName ? `${leaderName} won` : null, ...summary.gameNames])}
        </Text>
      </View>
      {featured ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text step="total">{featured.gross}</Text>
          <Text step="caption" tone={featured.grossToPar < 0 ? 'accent' : featured.grossToPar > 0 ? 'goldText' : 'tertiary'}>
            {net != null && net !== 0 ? `${formatNet(net)} ${unit}` : formatToPar(featured.grossToPar)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
