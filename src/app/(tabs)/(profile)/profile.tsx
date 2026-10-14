import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { ask, Avatar, FormRow, Icon, ListItem, ListSection, Pressable, ScrollScreen, Text } from '@/components/ui';
import { LiveRoundBanner } from '@/components/round';
import { PRESSED_OPACITY, useTheme } from '@/theme';
import { saveMyName, useAuthStore, useCourseStore, useMe, usePreferences, useSyncStatus } from '@/store';
import { formatIndex, formatShortDate } from '@/lib/format';
import { PRIVACY_POLICY_URL, SUPPORT_URL } from '@/services';

/** Profile: you (photo, name, handicap index, home course), your account, and the app's settings and help. */
export default function ProfileScreen() {
  const router = useRouter();
  const { c, space } = useTheme();
  const { me } = useMe();
  const photoUri = usePreferences((s) => s.photoUri);
  const homeCourseId = usePreferences((s) => s.homeCourseId);
  const update = usePreferences((s) => s.update);
  const homeCourse = useCourseStore((s) => s.byId)(homeCourseId ?? '');
  useCourseStore((s) => s.userCourses);
  const auth = useAuthStore();
  const sync = useSyncStatus();
  // null = not editing; the field shows the saved name.
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const commitName = (text: string) => {
    if (text.trim() && text.trim() !== me?.name) saveMyName(text);
    setNameDraft(null);
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: Platform.OS === 'web' });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (Platform.OS === 'web') {
        update({ photoUri: asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri });
        return;
      }
      // The picker hands back a cache file; keep a copy that survives cache clean-up.
      const dest = new File(Paths.document, `profile-${Date.now()}.jpg`);
      new File(asset.uri).copy(dest);
      if (photoUri && photoUri.startsWith(Paths.document.uri)) {
        try {
          new File(photoUri).delete();
        } catch {
          // An old copy that is already gone is fine.
        }
      }
      update({ photoUri: dest.uri });
    } catch (e) {
      void ask("Couldn't use that photo", e instanceof Error && e.message ? e.message : 'Try another one.', [{ label: 'OK', value: true }]);
    }
  };

  const version = Constants.expoConfig?.version ?? '';
  const build = Constants.expoConfig?.ios?.buildNumber;
  const external = <Icon name="external" size={14} color={c.textTertiary} />;

  return (
    <ScrollScreen title="Profile" largeTitle gap={space[6]}>
      <LiveRoundBanner />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        <Pressable accessibilityRole="button" accessibilityLabel={photoUri ? 'Change profile photo' : 'Add a profile photo'} onPress={() => void pickPhoto()} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
          <Avatar name={me?.name ?? '?'} size={64} photoUri={photoUri} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" step="title2" numberOfLines={2} tone={me ? 'primary' : 'tertiary'}>
            {me?.name ?? 'Your name'}
          </Text>
          <Text step="subhead" tone="secondary">
            {me?.handicapIndex != null ? `Handicap index ${formatIndex(me.handicapIndex)}` : 'No handicap index'}
          </Text>
        </View>
      </View>

      <ListSection header="You">
        <FormRow
          label="Name"
          placeholder="Add your name"
          value={nameDraft ?? me?.name ?? ''}
          onChangeText={setNameDraft}
          onEndEditing={(e) => commitName(e.nativeEvent.text)}
          autoCapitalize="words"
          returnKeyType="done"
          maxLength={40}
          accessibilityLabel="Your name"
        />
        <ListItem title="Handicap index" value={me?.handicapIndex != null ? formatIndex(me.handicapIndex) : 'None'} disabled={!me} onPress={() => router.push('/handicap')} accessibilityHint={me ? 'Change it and see its history' : 'Add your name first'} />
        <ListItem title="Home course" value={homeCourse?.name ?? 'None'} onPress={() => router.push('/home-course')} />
      </ListSection>

      {auth.status === 'signed-in' ? (
        <ListSection header="Account">
          <ListItem
            title={auth.method === 'apple' ? 'Signed in with Apple' : (auth.email ?? 'Signed in')}
            subtitle={auth.sessionExpired ? 'Sign in again to keep syncing' : sync.lastSyncedAt ? `Synced ${formatShortDate(sync.lastSyncedAt)}` : 'Synced to your account'}
            onPress={() => router.push('/settings')}
          />
        </ListSection>
      ) : auth.status === 'local' ? (
        <ListSection header="Account" footer="Keep your rounds when you change phones. Saved on this iPhone until you do.">
          <ListItem title="Sign in to sync" action onPress={() => router.push('/sign-in')} />
        </ListSection>
      ) : null}

      <ListSection header="App">
        <ListItem title="Settings" onPress={() => router.push('/settings')} testID="open-settings" />
        <ListItem title="How it works" onPress={() => router.push('/onboarding')} />
        <ListItem title="Contact support" trailing={external} accessory="none" onPress={() => void Linking.openURL(SUPPORT_URL)} accessibilityHint="Opens the website" />
        <ListItem title="Privacy policy" trailing={external} accessory="none" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} accessibilityHint="Opens the website" />
      </ListSection>

      <Text step="footnote" tone="tertiary" align="center">
        {`Birdies & Bets ${version}${build ? ` (${build})` : ''}`}
      </Text>
    </ScrollScreen>
  );
}
