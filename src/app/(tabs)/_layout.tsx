import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/theme';
import { useLiveRound } from '@/store';
import { LiveRoundAccessory, TAB_ACCESSORY } from '@/components/round';

/**
 * The native tab bar (Liquid Glass on iOS 26): Home · Courses · Play · Friends · Profile, SF Symbols filled when
 * selected. Each tab is a group with its own stack. On iOS 26 the round in progress rides in the bar's bottom accessory;
 * older iOS shows LiveRoundBanner on each tab instead. The web preview uses _layout.web.tsx.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const live = useLiveRound() != null;
  return (
    <NativeTabs tintColor={c.accent} minimizeBehavior="onScrollDown">
      {live && TAB_ACCESSORY ? (
        <NativeTabs.BottomAccessory>
          <Accessory />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="(home)" testID="tab-home">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(courses)" testID="tab-courses">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <NativeTabs.Trigger.Label>Courses</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(play)" testID="tab-play">
        <NativeTabs.Trigger.Icon sf="figure.golf" />
        <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(friends)" testID="tab-friends">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)" testID="tab-profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** The accessory is rendered twice (inline and regular); each copy asks where it sits. */
function Accessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return <LiveRoundAccessory placement={placement} />;
}
