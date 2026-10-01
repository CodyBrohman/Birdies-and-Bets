import { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { Button, Sheet, TextField } from '@/components/ui';
import { IndexField } from '@/components/IndexField';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store';
import { MAX_PROFILE_NAME } from '@/lib/profiles';
import type { PlayerProfile } from '@/types';

export interface AddFriendSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the new profile (Bet adds them to the crew straight away). */
  onAdded?: (profile: PlayerProfile) => void;
  title?: string;
}

/** Name and handicap index for someone you play with. Saved on this phone. */
export function AddFriendSheet({ visible, onClose, onAdded, title = 'Add a golf friend' }: AddFriendSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle="Saved on this phone. Blank index plays scratch.">
      {/* Remounts on every open, so the form starts empty. */}
      {visible ? <FriendForm onAdded={onAdded} onDone={onClose} /> : null}
    </Sheet>
  );
}

function FriendForm({ onAdded, onDone }: { onAdded?: (profile: PlayerProfile) => void; onDone: () => void }) {
  const { space } = useTheme();
  const addProfile = useProfileStore((s) => s.addProfile);
  const [name, setName] = useState('');
  const [index, setIndex] = useState<number | undefined>(undefined);
  const save = () => {
    if (!name.trim()) return;
    const profile = addProfile(name, index);
    Keyboard.dismiss();
    onAdded?.(profile);
    onDone();
  };
  return (
    <View style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        <TextField style={{ flex: 1 }} placeholder="Name" value={name} maxLength={MAX_PROFILE_NAME} autoCapitalize="words" autoFocus onChangeText={setName} accessibilityLabel="Friend's name" returnKeyType="done" onSubmitEditing={save} />
        <IndexField value={index} onChange={setIndex} label="Handicap index" style={{ height: 50 }} />
      </View>
      <Button label="Save friend" icon="arrow-forward" disabled={!name.trim()} onPress={save} />
    </View>
  );
}
