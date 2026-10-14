import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, Pressable, Text } from '@/components/ui';
import { PRESSED_OPACITY, useTheme } from '@/theme';
import { useLiveRound, type LiveRoundSummary } from '@/store';
import { joinMeta } from '@/lib/format';

/**
 * iOS 26 puts the round in progress in the tab bar's bottom accessory, on every tab. Older iOS and the web preview show
 * LiveRoundBanner at the top of each tab instead.
 */
export const TAB_ACCESSORY = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26;

function label(live: LiveRoundSummary): string {
  return `Round in progress at ${live.courseName}, hole ${live.hole}${live.scoreLine ? `, ${live.scoreLine}` : ''}. Resume round`;
}

/** A slim pine-tint row: "Cedar Ridge · Hole 7", the score so far, and Resume. Nothing when there is no round, or on iOS 26. */
export function LiveRoundBanner() {
  const { c, w, space } = useTheme();
  const router = useRouter();
  const live = useLiveRound();
  if (!live || TAB_ACCESSORY) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label(live)}
      testID="live-round-banner"
      onPress={() => router.push('/round/play')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        minHeight: 52,
        paddingVertical: space[2],
        paddingHorizontal: space[4],
        borderRadius: 12,
        backgroundColor: c.accentTint,
        opacity: pressed ? PRESSED_OPACITY : 1,
      })}
    >
      <Icon name="flag" size="sm" filled color={c.accentTintText} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text step="subhead" style={{ color: c.accentTintText, fontWeight: w.semibold }} numberOfLines={1}>
          {joinMeta([live.courseName, `Hole ${live.hole}`])}
        </Text>
        {live.scoreLine ? (
          <Text step="footnote" style={{ color: c.accentTintText }} numberOfLines={1}>
            {live.scoreLine}
          </Text>
        ) : null}
      </View>
      <Text step="subhead" style={{ color: c.accentTintText, fontWeight: w.semibold }}>
        Resume
      </Text>
    </Pressable>
  );
}

/**
 * The tab bar accessory on iOS 26. 'inline' is the minimised bar beside the tab icons ("Hole 7 · Resume"); 'regular'
 * sits above the tabs with the course and the score so far.
 */
export function LiveRoundAccessory({ placement }: { placement: 'regular' | 'inline' }) {
  const { c, w, space } = useTheme();
  const router = useRouter();
  const live = useLiveRound();
  if (!live) return null;
  const inline = placement === 'inline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label(live)}
      testID="live-round-accessory"
      onPress={() => router.push('/round/play')}
      style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], opacity: pressed ? PRESSED_OPACITY : 1 })}
    >
      <Icon name="flag" size="sm" filled color={c.accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text step="subhead" style={{ fontWeight: w.semibold }} numberOfLines={1}>
          {inline ? `Hole ${live.hole}` : joinMeta([live.courseName, `Hole ${live.hole}`])}
        </Text>
        {!inline && live.scoreLine ? (
          <Text step="footnote" tone="secondary" numberOfLines={1}>
            {live.scoreLine}
          </Text>
        ) : null}
      </View>
      <Text step="subhead" tone="accent" style={{ fontWeight: w.semibold }}>
        Resume
      </Text>
    </Pressable>
  );
}
