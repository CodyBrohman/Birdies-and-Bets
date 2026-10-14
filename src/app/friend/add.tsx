import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { FormRow, ListSection, SheetScreen } from '@/components/ui';
import { useProfileStore } from '@/store';
import { parseIndex } from '@/lib/format';
import { MAX_PROFILE_NAME } from '@/lib/profiles';

/** Add a friend: a name and, if they have one, a handicap index. Saved on this phone (and synced when signed in). */
export default function AddFriendSheet() {
  const router = useRouter();
  const addProfile = useProfileStore((s) => s.addProfile);
  const [name, setName] = useState('');
  const [index, setIndex] = useState('');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/friends'));
  const save = () => {
    if (!name.trim()) return;
    addProfile(name, parseIndex(index));
    Keyboard.dismiss();
    close();
  };

  return (
    <SheetScreen title="Add friend" onClose={close} action={{ label: 'Add', onPress: save, disabled: !name.trim(), testID: 'save-friend' }}>
      <ListSection footer="Leave the index blank to play without a handicap. Plus handicaps start with +.">
        <FormRow label="Name" placeholder="Required" value={name} onChangeText={setName} maxLength={MAX_PROFILE_NAME} autoCapitalize="words" autoFocus returnKeyType="next" accessibilityLabel="Friend's name" testID="friend-name" />
        <FormRow
          label="Handicap"
          placeholder="Index, e.g. 12.4"
          value={index}
          onChangeText={setIndex}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          maxLength={5}
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel="Friend's handicap index"
        />
      </ListSection>
    </SheetScreen>
  );
}
