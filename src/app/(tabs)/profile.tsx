import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { Avatar, Card, Chip, IconTile, ListRow, NoteBar, Screen, ScreenHeader, SectionLabel, Stepper, Text, TextField, Pressable } from '@/components/ui';
import { AreaSheet } from '@/components/AreaSheet';
import { IndexField } from '@/components/IndexField';
import { useTheme } from '@/theme';
import { CLUBS, DEFAULT_BAG, saveMyName, useMe, usePreferences, useProfileStore } from '@/store';
import { formatIndex, plural } from '@/lib/format';

/** Profile: your golfer card (photo, name, area, index) and the clubs in your bag. Settings live one tap away. */
export default function ProfileScreen() {
  const router = useRouter();
  const { c, f, radius, space, layout } = useTheme();
  const { me } = useMe();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const homeArea = usePreferences((s) => s.homeArea);
  const photoUri = usePreferences((s) => s.photoUri);
  const bag = usePreferences((s) => s.bag) ?? DEFAULT_BAG;
  const update = usePreferences((s) => s.update);
  // null = not editing; the field shows the saved name.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? me?.name ?? '';
  const [areaOpen, setAreaOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(true);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const commitName = () => {
    if (name.trim() && name.trim() !== me?.name) saveMyName(name);
    setNameDraft(null);
  };

  const pickPhoto = async () => {
    setPhotoError(null);
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
      setPhotoError(e instanceof Error ? e.message : 'Could not use that photo.');
    }
  };

  const toggleClub = (id: string) => update({ bag: bag.includes(id) ? bag.filter((x) => x !== id) : [...bag, id] });

  return (
    <Screen noBottomInset>
      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingTop: space[6], paddingBottom: layout.section }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow="Your golfer card" title="Make it yours." subtitle="A few details to make every round feel like yours." style={{ marginBottom: space[2] }} />

        <Card variant="hero" padding="roomy" style={{ gap: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={() => void pickPhoto()}>
              <Avatar name={me?.name ?? '?'} index={0} size={84} photoUri={photoUri} />
              <View style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 999, backgroundColor: c.goldFill, borderWidth: 2, borderColor: c.hero, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera-outline" size={14} color={c.textPrimary} />
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text step="eyebrow" style={{ color: c.onHeroSoft, fontSize: 10 }}>
                Golfer profile
              </Text>
              <Text step="headline" numberOfLines={2} style={{ color: c.onHero }}>
                {me?.name ?? 'Your name'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={14} color={c.onHero} />
                <Text step="caption" tabular={false} numberOfLines={1} style={{ color: c.onHero, fontFamily: f.uiSemibold }}>
                  {homeArea ?? 'Set your area'}
                </Text>
              </View>
            </View>
            <View accessible accessibilityLabel={`Handicap index ${formatIndex(me?.handicapIndex)}`} style={{ backgroundColor: c.goldFill, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 60 }}>
              <Text step="title" style={{ fontSize: 20, lineHeight: 24 }} tabular>
                {formatIndex(me?.handicapIndex)}
              </Text>
              <Text step="overline" style={{ fontSize: 9, lineHeight: 11, color: c.textPrimary }}>
                HCP
              </Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} hitSlop={10} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="pencil-outline" size={15} color={c.onHero} />
            <Text step="caption" tabular={false} style={{ color: c.onHero, fontFamily: f.uiBold }}>
              {photoUri ? 'Change profile photo' : 'Add a profile photo'}
            </Text>
          </Pressable>
          {photoError ? (
            <Text step="caption" tabular={false} style={{ color: c.goldFill }}>
              {photoError}
            </Text>
          ) : null}
        </Card>

        <Card style={{ gap: 0 }}>
          <TextField variant="underline" label="Your name" value={name} onChangeText={setNameDraft} onBlur={commitName} onSubmitEditing={commitName} placeholder="Add your name" autoCapitalize="words" accessibilityLabel="Your name" returnKeyType="done" maxLength={40} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: c.divider, opacity: me ? 1 : 0.45 }} pointerEvents={me ? 'auto' : 'none'}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text step="title" style={{ fontSize: 15 }}>
                Handicap index
              </Text>
              <Text step="caption" tone="tertiary" tabular={false} style={{ fontSize: 12 }}>
                {me ? 'Adjust your current index.' : 'Add your name first.'}
              </Text>
            </View>
            <Stepper
              value={me?.handicapIndex ?? 18}
              min={-10}
              max={54}
              step={0.1}
              onChange={(v) => me && updateProfile(me.id, { handicapIndex: v })}
              accessibilityLabel="Handicap index"
              center={<IndexField key={`${me?.id}-${me?.handicapIndex}`} value={me?.handicapIndex} onChange={(v) => me && updateProfile(me.id, { handicapIndex: v })} label="Handicap index" commitOnBlur style={{ width: 64, height: 40, paddingHorizontal: 4, backgroundColor: 'transparent' }} />}
            />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Home course area: ${homeArea ?? 'not set'}. Change`} onPress={() => setAreaOpen(true)} style={({ pressed }) => ({ paddingTop: space[4], gap: 6, opacity: pressed ? 0.6 : 1 })}>
            <Text step="caption" tone="secondary" tabular={false}>
              Home course area
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}>
              <Ionicons name="location-outline" size={18} color={c.textPrimary} />
              <Text step="title" style={{ fontSize: 15, flex: 1 }} tone={homeArea ? 'primary' : 'tertiary'}>
                {homeArea ?? 'Add your area'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            </View>
          </Pressable>
        </Card>

        <SectionLabel style={{ marginTop: layout.section - layout.stack }}>Clubs in your bag</SectionLabel>
        <Card style={{ gap: space[3] }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: bagOpen }} accessibilityLabel={`Your current setup, ${plural(bag.length, 'club')}`} onPress={() => setBagOpen(!bagOpen)} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconTile icon="golf-outline" size={40} />
            <View style={{ flex: 1 }}>
              <Text step="title" style={{ fontSize: 15 }}>
                Your current setup
              </Text>
              <Text step="caption" tone="tertiary" tabular={false} style={{ fontSize: 12 }}>
                {plural(bag.length, 'club')} selected · Tap to {bagOpen ? 'close' : 'edit'}
              </Text>
            </View>
            <Ionicons name={bagOpen ? 'chevron-up' : 'chevron-down'} size={20} color={c.textPrimary} />
          </Pressable>
          {bagOpen ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.divider }}>
              {CLUBS.map((club) => (
                <Chip key={club.id} label={club.label} selected={bag.includes(club.id)} onPress={() => toggleClub(club.id)} accessibilityLabel={`${club.label}${bag.includes(club.id) ? ', in the bag' : ''}`} />
              ))}
            </View>
          ) : null}
        </Card>

        <NoteBar>Your profile and bag details are saved on this device.</NoteBar>

        <SectionLabel style={{ marginTop: layout.section - layout.stack }}>More</SectionLabel>
        <Card padding="none" style={{ paddingHorizontal: space[4] }}>
          {me ? <ListRow leading={<IconTile icon="trending-down-outline" size={40} />} title="Index history" meta="Every change, round by round" onPress={() => router.push({ pathname: '/friends/[id]', params: { id: me.id } })} trailing={<Ionicons name="chevron-forward" size={16} color={c.textTertiary} />} /> : null}
          <ListRow divider={!!me} leading={<IconTile icon="options-outline" size={40} />} title="Settings" meta="Round defaults, haptics, backup" onPress={() => router.push('/settings')} trailing={<Ionicons name="chevron-forward" size={16} color={c.textTertiary} />} />
          <ListRow divider leading={<IconTile icon="help-circle-outline" size={40} />} title="How it works" meta="The quick tour" onPress={() => router.push('/onboarding')} trailing={<Ionicons name="chevron-forward" size={16} color={c.textTertiary} />} />
        </Card>
      </ScrollView>

      <AreaSheet visible={areaOpen} onClose={() => setAreaOpen(false)} />
    </Screen>
  );
}
