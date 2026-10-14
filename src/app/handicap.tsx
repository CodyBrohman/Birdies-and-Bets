import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { FormRow, ListItem, ListSection, SheetScreen, Text } from '@/components/ui';
import { useMe, useProfileStore } from '@/store';
import { formatIndex, formatShortDate, parseIndex } from '@/lib/format';

/** Your handicap index: change it, and every change so far (newest first). */
export default function HandicapSheet() {
  const router = useRouter();
  const { me } = useMe();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  if (!me) {
    return (
      <SheetScreen title="Handicap index" onClose={close}>
        <Text step="rowBody" tone="secondary">
          Add your name on Profile first.
        </Text>
      </SheetScreen>
    );
  }
  const history = [...me.indexHistory].reverse();

  return (
    <SheetScreen title="Handicap index" onClose={close}>
      <ListSection footer="Plus handicaps start with +. Leave it blank to play without a handicap.">
        <FormRow
          label="Index"
          placeholder="e.g. 12.4"
          defaultValue={me.handicapIndex != null ? formatIndex(me.handicapIndex) : ''}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          maxLength={5}
          autoFocus
          returnKeyType="done"
          onEndEditing={(e) => updateProfile(me.id, { handicapIndex: parseIndex(e.nativeEvent.text) })}
          accessibilityLabel="Handicap index"
        />
      </ListSection>
      {history.length > 0 ? (
        <ListSection header="History">
          {history.map((entry, i) => {
            const prev = history[i + 1];
            const delta = prev && prev.index != null && entry.index != null ? Math.round((entry.index - prev.index) * 10) / 10 : null;
            return (
              <ListItem
                key={`${entry.at}-${i}`}
                title={entry.index == null ? 'No handicap' : formatIndex(entry.index)}
                subtitle={delta ? (delta < 0 ? `Down ${Math.abs(delta).toFixed(1)}` : `Up ${delta.toFixed(1)}`) : undefined}
                value={formatShortDate(entry.at)}
              />
            );
          })}
        </ListSection>
      ) : null}
    </SheetScreen>
  );
}
