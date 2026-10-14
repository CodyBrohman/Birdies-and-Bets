import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, SheetScreen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { MAX_NOTE_LENGTH, useRound, useRoundStore } from '@/store';

/** The note for the hole on screen, as a sheet over the scorecard. Save keeps it; Remove note clears it. */
export default function HoleNoteSheet() {
  const router = useRouter();
  const { c, t, space } = useTheme();
  const round = useRound();
  const setHoleNote = useRoundStore((s) => s.setHoleNote);
  const holeNumber = round?.currentHole ?? 1;
  const saved = round?.holeResults.find((r) => r.holeNumber === holeNumber)?.note ?? '';
  const [text, setText] = useState(saved);
  if (!round) return null;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/round/play'));
  const save = (value: string) => {
    setHoleNote(holeNumber, value);
    close();
  };

  return (
    <SheetScreen title={`Hole ${holeNumber} note`} onClose={close} action={{ label: 'Save', onPress: () => save(text), disabled: text.trim() === saved.trim() }}>
      <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, padding: space[3] }}>
        <TextInput
          accessibilityLabel={`Note for hole ${holeNumber}`}
          placeholder="Lost ball left, press starts here"
          placeholderTextColor={c.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX_NOTE_LENGTH}
          autoFocus
          style={{ minHeight: 96, textAlignVertical: 'top', color: c.textPrimary, fontSize: t.rowBody.fontSize, lineHeight: t.rowBody.lineHeight }}
        />
      </View>
      <Text step="footnote" tone="tertiary" align="right" tabular>
        {text.length} of {MAX_NOTE_LENGTH}
      </Text>
      {saved ? <Button label="Remove note" variant="plain" destructive onPress={() => save('')} /> : null}
    </SheetScreen>
  );
}
