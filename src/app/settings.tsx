import { useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Button, Card, Screen, SectionLabel, Sheet, Text, Toggle } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { AllowanceField, FieldRow, StakeLabelField } from '@/components/round/SettingsFields';
import { useTheme } from '@/theme';
import { clearAllData, exportBackup, importBackup, SCHEMA_VERSION, storageBackend, useAuthStore, useMe, usePreferences, useRoundStore, useSyncStatus } from '@/store';
import { describeBackup, parseBackup, type BackupFile } from '@/lib/backup';
import { formatShortDate } from '@/lib/format';
import { deleteAccount, PRIVACY_POLICY_URL, signOut, track } from '@/services';

type Busy = 'export' | 'import' | 'clear' | 'signout' | 'delete' | null;

/** Feel, new-round defaults, data (back up / restore / clear), privacy choices and what build this is. Opened from Profile. */
export default function SettingsScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const inProgress = useRoundStore((s) => s.round?.status === 'in-progress');
  const haptics = usePreferences((s) => s.haptics);
  const defaultStakeLabel = usePreferences((s) => s.defaultStakeLabel);
  const defaultAllowance = usePreferences((s) => s.defaultAllowance);
  const crashReports = usePreferences((s) => s.crashReports);
  const analytics = usePreferences((s) => s.analytics === true);
  const updatePreferences = usePreferences((s) => s.update);

  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const auth = useAuthStore();
  const sync = useSyncStatus();
  const { me } = useMe();

  const leave = async (kind: 'signout' | 'delete') => {
    setMessage(null);
    setBusy(kind);
    try {
      await (kind === 'delete' ? deleteAccount() : signOut());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'That did not work. Check your connection and try again.');
      setBusy(null);
    }
  };

  const backUp = async () => {
    setMessage(null);
    setBusy('export');
    try {
      const json = await exportBackup();
      const name = `birdies-and-bets-backup-${new Date().toISOString().slice(0, 10)}.json`;
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        track('backup_created');
        return;
      }
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save backup' });
      track('backup_created');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not create the backup.');
    } finally {
      setBusy(null);
    }
  };

  const pickRestore = async () => {
    setMessage(null);
    setBusy('import');
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', 'text/plain'], copyToCacheDirectory: true, multiple: false });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
      const parsed = parseBackup(text);
      if (!parsed.ok) {
        setMessage(parsed.reason);
        return;
      }
      setPending(parsed.file);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (!pending) return;
    setBusy('import');
    try {
      await importBackup(pending);
      track('backup_restored');
      setPending(null);
      router.replace('/');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Restore failed.');
      setPending(null);
    } finally {
      setBusy(null);
    }
  };

  const clear = async () => {
    setBusy('clear');
    try {
      await clearAllData();
      setConfirmClear(false);
      router.replace('/');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not clear the data.');
      setConfirmClear(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <SetupHeader title="Settings" fallback="/profile" />
      <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[6] }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {auth.status === 'signed-in' ? (
          <>
            <SectionLabel>Account</SectionLabel>
            <Card padding="roomy" style={{ gap: space[3] }}>
              <View style={{ gap: 2 }}>
                <Text step="bodyStrong">{me?.name ?? 'Signed in'}</Text>
                <Text step="label" tone="secondary">
                  {auth.method === 'apple' ? 'Signed in with Apple' : auth.email ? `Signed in as ${auth.email}` : 'Signed in by email'}
                </Text>
                <Text step="caption" tone="tertiary" tabular={false} accessibilityLiveRegion="polite">
                  {syncLine(sync)}
                </Text>
              </View>
              <Button label={busy === 'signout' ? 'Signing out…' : 'Sign out'} variant="secondary" disabled={busy != null} onPress={() => setConfirmSignOut(true)} />
              <Button label="Delete account" variant="secondary" destructive disabled={busy != null} onPress={() => setConfirmDelete(true)} />
            </Card>
          </>
        ) : null}

        <SectionLabel style={{ marginTop: auth.status === 'signed-in' ? space[3] : 0 }}>Feel</SectionLabel>
        <Card padding="roomy">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[4] }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text step="bodyStrong">Haptics</Text>
            </View>
            <Toggle value={haptics} onChange={(v) => updatePreferences({ haptics: v })} accessibilityLabel="Haptics" />
          </View>
        </Card>

        <SectionLabel style={{ marginTop: space[3] }}>New rounds</SectionLabel>
        <Card padding="roomy" style={{ gap: space[5] }}>
          <StakeLabelField key={defaultStakeLabel === 'points' || defaultStakeLabel === '$' ? defaultStakeLabel : 'custom'} value={defaultStakeLabel} onChange={(defaultStakeLabel) => updatePreferences({ defaultStakeLabel })} />
          <AllowanceField value={defaultAllowance} onChange={(defaultAllowance) => updatePreferences({ defaultAllowance })} />
        </Card>

        <SectionLabel style={{ marginTop: space[3] }}>Your data</SectionLabel>
        <Card padding="roomy">
          <Text step="bodyStrong">Back up</Text>
          <Text step="label" tone="secondary" style={{ marginTop: 2, marginBottom: space[3] }}>
            One file with every round, course and player.
          </Text>
          <Button label={busy === 'export' ? 'Preparing…' : 'Back up data'} variant="secondary" disabled={busy != null} onPress={() => void backUp()} />
        </Card>
        <Card padding="roomy">
          <Text step="bodyStrong">Restore</Text>
          <Text step="label" tone="secondary" style={{ marginTop: 2, marginBottom: space[3] }}>
            Replace everything with a backup file.
          </Text>
          <Button label={busy === 'import' ? 'Reading…' : 'Restore from backup'} variant="secondary" disabled={busy != null} onPress={() => void pickRestore()} />
        </Card>
        <Card padding="roomy" variant="outlined">
          <Text step="bodyStrong">Clear all data</Text>
          <Text step="label" tone="secondary" style={{ marginTop: 2, marginBottom: space[3] }}>
            {auth.status === 'signed-in' ? 'Rounds, courses and players, here and in your account. Settings stay.' : 'Rounds, courses and players. Settings stay.'}
          </Text>
          <Button label="Clear all data" variant="secondary" destructive disabled={busy != null} onPress={() => setConfirmClear(true)} />
        </Card>
        {message ? (
          <Text step="caption" tone="negative" tabular={false}>
            {message}
          </Text>
        ) : null}

        <SectionLabel style={{ marginTop: space[3] }}>Privacy</SectionLabel>
        <Card padding="roomy" style={{ gap: space[4] }}>
          <ToggleRow title="Crash reports" detail="Anonymous error details help fix bugs. No names or scores." value={crashReports} onChange={(v) => updatePreferences({ crashReports: v })} />
          <ToggleRow title="Usage analytics" detail="Anonymous counts, like rounds started. Off unless you turn it on." value={analytics} onChange={(v) => updatePreferences({ analytics: v })} />
          <Button label="Read the privacy policy" variant="secondary" icon="open-outline" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
        </Card>

        <SectionLabel style={{ marginTop: space[3] }}>About</SectionLabel>
        <Card variant="outlined" padding="roomy">
          <Row label="Version" value={Constants.expoConfig?.version ?? '—'} />
          <Row label="Update" value={Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded'} />
          <Row label="Storage" value={storageBackend === 'mmkv' ? 'MMKV' : 'AsyncStorage'} />
          <Row label="Data schema" value={String(SCHEMA_VERSION)} last />
        </Card>
        <Button label="Show the intro again" variant="secondary" onPress={() => router.push('/onboarding')} />
      </ScrollView>

      <Sheet visible={pending != null} onClose={() => setPending(null)} title="Restore this backup?" subtitle={pending ? describeBackup(pending, formatShortDate) : ''}>
        <View style={{ gap: space[2] }}>
          <Text tone="secondary">
            This replaces every round, course and player on this phone.{inProgress ? ' The round in progress will be lost.' : ''}
          </Text>
          <Button label="Replace and restore" disabled={busy != null} onPress={() => void restore()} />
          <Button label="Cancel" variant="secondary" onPress={() => setPending(null)} />
        </View>
      </Sheet>

      <Sheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)} title="Sign out?" subtitle="Your data stays in your account">
        <View style={{ gap: space[2] }}>
          <Text tone="secondary">{"Anything not yet synced is sent first. Then this phone's rounds, courses and players are removed; sign back in to get them again."}</Text>
          <Button label={busy === 'signout' ? 'Signing out…' : 'Sign out'} disabled={busy != null} onPress={() => void leave('signout')} />
          <Button label="Stay signed in" variant="secondary" onPress={() => setConfirmSignOut(false)} />
        </View>
      </Sheet>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?" subtitle="This cannot be undone">
        <View style={{ gap: space[2] }}>
          <Text tone="secondary">Your account and everything saved with it (rounds, history, courses, players and settings) are deleted from our servers and from this phone.</Text>
          <Button label={busy === 'delete' ? 'Deleting…' : 'Delete my account'} destructive disabled={busy != null} onPress={() => void leave('delete')} />
          <Button label="Keep my account" variant="secondary" onPress={() => setConfirmDelete(false)} />
        </View>
      </Sheet>

      <Sheet visible={confirmClear} onClose={() => setConfirmClear(false)} title="Clear all data?" subtitle="This cannot be undone">
        <View style={{ gap: space[2] }}>
          <Text tone="secondary">
            {auth.status === 'signed-in' ? 'Every round, course and player will be deleted from your account and from every phone you are signed in on.' : 'Every round, course and player on this phone will be deleted.'}{inProgress ? ' The round in progress will be lost.' : ''} Preferences stay.
          </Text>
          <Button label={busy === 'clear' ? 'Clearing…' : 'Delete everything'} disabled={busy != null} onPress={() => void clear()} />
          <Button label="Keep my data" variant="secondary" onPress={() => setConfirmClear(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

/** "Synced just now" / "Offline · 3 changes waiting" for the Account card. */
function syncLine(s: { phase: string; pending: number; lastSyncedAt?: string }): string {
  if (s.phase === 'syncing') return 'Syncing…';
  if (s.phase === 'offline') return s.pending ? `Offline · ${s.pending} ${s.pending === 1 ? 'change' : 'changes'} waiting` : 'Offline';
  if (s.phase === 'error') return s.pending ? `Couldn't sync · ${s.pending} waiting, will retry` : "Couldn't sync, will retry";
  if (!s.lastSyncedAt) return 'Not synced yet';
  const mins = Math.round((Date.now() - new Date(s.lastSyncedAt).getTime()) / 60000);
  return mins < 1 ? 'Synced just now' : mins < 60 ? `Synced ${mins} min ago` : `Synced ${formatShortDate(s.lastSyncedAt)}`;
}

function ToggleRow({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[4] }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text step="bodyStrong">{title}</Text>
        <Text step="label" tone="secondary">
          {detail}
        </Text>
      </View>
      <Toggle value={value} onChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { c, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[2], borderBottomWidth: last ? 0 : 1, borderBottomColor: c.dividerSoft }}>
      <Text step="body" tone="secondary">
        {label}
      </Text>
      <Text step="bodyStrong" tabular>
        {value}
      </Text>
    </View>
  );
}
