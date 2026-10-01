import { useRef, useState, type ComponentProps } from 'react';
import { ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Screen, Text } from '@/components/ui';
import { BrandMark } from '@/components/BrandMark';
import { ContourField } from '@/components/ContourField';
import { useTheme } from '@/theme';
import { usePreferences } from '@/store';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Page {
  icon: IoniconName;
  title: string;
  body: string;
  points: string[];
}

const PAGES: Page[] = [
  {
    icon: 'golf-outline',
    title: 'Keep score.',
    body: 'Tap a score. The hole advances. Everything is saved.',
    points: ['Works offline, no account', 'Front nine, back nine or shotgun starts', 'Handicap strokes worked out per hole'],
  },
  {
    icon: 'trophy-outline',
    title: 'Run the games.',
    body: 'Stack any side games. Scored live from hole 1.',
    points: ['Skins, Nassau, Match play, Stableford, Wolf…', 'Gross or net, per game', 'Add or change a game mid-round'],
  },
  {
    icon: 'people-outline',
    title: 'Settle it on the 19th.',
    body: 'One tally at the end, netted between players.',
    points: ['Points by default, or name the stake', 'Nothing is paid through the app', 'Share the card to the group chat'],
  },
];

/** First launch: three swipes on what the app does, then straight into a round or back to Home. */
export default function OnboardingScreen() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // The pager's own width (the web preview frame is narrower than the window).
  const [width, setWidth] = useState(windowWidth);
  const update = usePreferences((s) => s.update);
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const finish = (startRound: boolean) => {
    update({ onboarded: true });
    if (startRound) router.replace('/courses');
    else if (router.canGoBack()) router.back();
    else router.replace('/' as Href);
  };
  const go = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[5], paddingTop: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <BrandMark size={28} />
          <Text step="bodyStrong">Birdies & Bets</Text>
        </View>
        {!last ? <Button label="Skip" variant="tinted" size="md" haptic={false} onPress={() => finish(false)} /> : null}
      </View>

      <ScrollView ref={scroller} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'stretch' }}>
        {PAGES.map((p) => (
          <View key={p.title} style={{ width, paddingHorizontal: space[5], justifyContent: 'center', gap: space[4] }}>
            <ContourField opacity={0.06} />
            <View style={{ width: 88, height: 88, borderRadius: radius.pill, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={p.icon} size={40} color={c.accentText} />
            </View>
            <Text step="display" style={{ fontSize: 40, lineHeight: 44 }}>
              {p.title}
            </Text>
            <Text step="body" tone="secondary" style={{ fontSize: 18, lineHeight: 26 }}>
              {p.body}
            </Text>
            <View style={{ gap: space[2], marginTop: space[1] }}>
              {p.points.map((pt) => (
                <View key={pt} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3] }}>
                  <Ionicons name="checkmark-circle" size={22} color={c.positive} style={{ marginTop: 1 }} />
                  <Text step="body" style={{ flex: 1 }}>
                    {pt}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: space[5], gap: space[3], paddingTop: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }} accessibilityRole="progressbar" accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((_, i) => (
            <View key={i} style={{ width: i === page ? 22 : 8, height: 8, borderRadius: radius.pill, backgroundColor: i === page ? c.accent : c.tickUpcoming }} />
          ))}
        </View>
        {last ? (
          <>
            <Button label="Start a round" onPress={() => finish(true)} />
            <Button label="Maybe later" variant="secondary" onPress={() => finish(false)} />
          </>
        ) : (
          <Button label="Next" onPress={() => go(page + 1)} />
        )}
      </View>
    </Screen>
  );
}
