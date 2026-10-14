import { useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Button, HeaderButton, Icon, Screen, Text, type IconName } from '@/components/ui';
import { Wordmark } from '@/components/BrandMark';
import { useTheme } from '@/theme';
import { usePreferences } from '@/store';
import { analyticsAvailable } from '@/services';

interface Page {
  icon: IconName;
  title: string;
  body: string;
  /** The analytics question: its own two buttons. */
  consent?: boolean;
}

const PAGES: Page[] = [
  { icon: 'flag', title: 'Keep score', body: 'Tap + or − for each player. Every tap is saved, even offline.' },
  { icon: 'trophy', title: 'Run the games', body: 'Skins, Nassau, match play, Stableford, Wolf and more, scored as you go.' },
  { icon: 'friends', title: 'Points, not money', body: 'The app keeps a points tally between players. Nothing is paid or collected.' },
  { icon: 'info', title: 'Share anonymous usage?', body: 'Counts like how many rounds get started help make the app better. Never names, scores or courses. Change it any time in Settings.', consent: true },
];

/** First launch: three short pages on what the app does (and the usage question when it is set up), then a round or Home. */
export default function OnboardingScreen() {
  // The usage question only appears when usage counts can actually be sent.
  const [pages] = useState(() => PAGES.filter((p) => !p.consent || analyticsAvailable()));
  const router = useRouter();
  const { c, space } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // The pager's own width (the web preview frame is narrower than the window).
  const [width, setWidth] = useState(windowWidth);
  const update = usePreferences((s) => s.update);
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === pages.length - 1;
  const asking = !!pages[page]?.consent;

  // Leaving the tour without answering counts as "No thanks".
  const finish = (startRound: boolean) => {
    // Read the answer from the store: one given a moment ago is not in this render yet.
    update({ onboarded: true, ...(usePreferences.getState().analytics === undefined ? { analytics: false } : {}) });
    if (startRound) router.replace('/play');
    else if (router.canGoBack()) router.back();
    else router.replace('/' as Href);
  };
  const go = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const answer = (yes: boolean) => {
    update({ analytics: yes });
    finish(false);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space[5], paddingRight: space[3], paddingTop: space[2] }}>
        <Wordmark />
        {!last ? <HeaderButton label="Skip" onPress={() => finish(false)} testID="onboarding-skip" /> : null}
      </View>

      <ScrollView ref={scroller} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'stretch' }}>
        {pages.map((p) => (
          <View key={p.title} accessible accessibilityLabel={`${p.title}. ${p.body}`} style={{ width, paddingHorizontal: space[6], justifyContent: 'center', gap: space[4] }}>
            <Icon name={p.icon} size={44} color={c.accent} filled />
            <Text accessibilityRole="header" step="title1">
              {p.title}
            </Text>
            <Text step="rowBody" tone="secondary">
              {p.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: space[5], gap: space[3], paddingTop: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }} accessible accessibilityRole="progressbar" accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
          {pages.map((_, i) => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: i === page ? c.accent : c.tickUpcoming }} />
          ))}
        </View>
        {asking ? (
          <>
            <Button label="Share anonymous usage" onPress={() => answer(true)} />
            <Button label="No thanks" variant="plain" onPress={() => answer(false)} />
          </>
        ) : last ? (
          <>
            <Button label="Start a round" onPress={() => finish(true)} />
            <Button label="Maybe later" variant="plain" onPress={() => finish(false)} />
          </>
        ) : (
          <Button label="Next" onPress={() => go(page + 1)} />
        )}
      </View>
    </Screen>
  );
}
