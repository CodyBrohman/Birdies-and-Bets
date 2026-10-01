import { useState } from 'react';
import { View } from 'react-native';
import { Button, Sheet, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { usePreferences } from '@/store';

/** Set the free-text home area shown on Courses and Profile. */
export function AreaSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Your area" subtitle="A town or region. It stays on this phone.">
      {/* Remounts on every open, so the field starts from the saved value. */}
      {visible ? <AreaForm onDone={onClose} /> : null}
    </Sheet>
  );
}

function AreaForm({ onDone }: { onDone: () => void }) {
  const { space } = useTheme();
  const homeArea = usePreferences((s) => s.homeArea);
  const update = usePreferences((s) => s.update);
  const [value, setValue] = useState(homeArea ?? '');
  const save = () => {
    update({ homeArea: value.trim() || undefined });
    onDone();
  };
  return (
    <View style={{ gap: space[3] }}>
      <TextField value={value} onChangeText={setValue} placeholder="Toronto, ON" accessibilityLabel="Home area" autoFocus returnKeyType="done" onSubmitEditing={save} maxLength={40} />
      <Button label="Save area" onPress={save} />
    </View>
  );
}
