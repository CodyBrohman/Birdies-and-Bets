import { useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { ask, Button, Card, confirm, Screen, SectionLabel, Text, Toggle } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { AllowanceField, StakeLabelField } from '@/components/round/SettingsFields';
import { useTheme } from '@/theme';
import { clearAllData, exportBackup, importBackup, SCHEMA_VERSION, storageBackend, useAuthStore, useMe, usePreferences, useRoundStore, useSyncStatus } from '@/store';
import { describeBackup, parseBackup } from '@/lib/backup';
import { formatShortDate, plural } from '@/lib/format';
import { deleteAccount, PRIVACY_POLICY_URL, restoreWithSync, retryRejected, signOut, track } from '@/services';

type Busy = 'export' | 'import' | 'clear' | 'signout' | 'delete' | null;

/** Account, feel, new-round defaults, data (back up / restore / clear), privacy choices and what build this is. Opened from Profile. */
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
  const auth = useAuthStore();
  const sync = useSyncStatus();
  const { me } = useMe();
  const signedIn = auth.status === 'signed-in';

  const run = async (kind: Exclude<Busy, null>, work: () => Promise<void>, failure: string) => {
    setMessage(null);
    setBusy(kind);
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error && e.message ? e.message : failure);
    } finally {
      setBusy(null);
    }
  };

  const askSignOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: "Your rounds stay in your account. This iPhone's rounds, courses and players are removed; sign back in to get them again.",
      confirmLabel: 'Sign out',
    });
    if (!ok) return;
    await run(
      'signout',
      async () => {
        const { unsynced } = await signOut();
        if (unsynced === 0) return;
        const choice = await ask(`${plural(unsynced, 'change')} not synced yet`, "There's no connection, so they haven't reached your account. Signing out now loses them.", [
          { label: 'Stay signed in', value: 'stay', style: 'cancel' },
          { label: 'Sign out anyway', value: 'discard', style: 'destructive' },
        ]);
        if (choice === 'discard') await signOut({ discardUnsynced: true });
      },
      "Couldn't sign out. Try again.",
    );
  };

  const askDelete = async () => {
    const ok = await confirm({
      title: 'Delete your account?',
      message: 'Your account and everything saved with it (rounds, courses, players and settings) are deleted from our servers and from this iPhone. This cannot be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
    });
    if (ok) await run('delete', deleteAccount, 'Could not delete the account. Check your connection and try again.');
  };

  const backUp = () =>
    run(
      'export',
      async () => {
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
      },
      'Could not create the backup.',
    );

  const restore = () =>
    run(
      'import',
      async () => {
        const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', 'text/plain'], copyToCacheDirectory: true, multiple: false });
        if (picked.canceled || !picked.assets[0]) return;
        const asset = picked.assets[0];
        const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
        const parsed = parseBackup(text);
        if (!parsed.ok) {
          setMessage(parsed.reason);
          return;
        }
        const ok = await confirm({
          title: 'Restore this backup?',
          message: `${describeBackup(parsed.file, formatShortDate)}. ${
            signedIn ? 'It is merged with your account: rounds your account is missing come back, and nothing is deleted.' : 'It replaces every round, course and player on this iPhone.'
          }${inProgress && !signedIn ? ' The round in progress will be lost.' : ''}`,
          confirmLabel: 'Restore',
          destructive: !signedIn,
        });
        if (!ok) return;
        await restoreWithSync(() => importBackup(parsed.file));
        track('backup_restored');
        router.replace('/');
      },
      'Could not read that file.',
    );

  const clear = async () => {
    const ok = await confirm({
      title: 'Clear all data?',
      message: `${signedIn ? 'Every round, course and player is deleted from your account and from every phone signed in to it.' : 'Every round, course and player on this iPhone is deleted.'}${inProgress ? ' The round in progress will be lost.' : ''} Settings stay. This cannot be undone.`,
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!ok) return;
    await run(
      'clear',
      async () => {
        await clearAllData();
        router.replace('/');
      },
      'Could not clear the data.',
    );
  };

  return (
    <Screen>
      <SetupHeader title="Settings" fallback="/profile" />
      <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[6] }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {signedIn ? (
          <>
            <SectionLabel>Account</SectionLabel>
            <Card padding="roomy" style={{ gap: space[3] }}>
              <View style={{ gap: 2 }}>
                <Text step="bodyStrong">{me?.name ?? 'Signed in'}</Text>
                <Text step="label" tone="secondary">
                  {auth.method === 'apple' ? 'Signed in with Apple' : auth.email ? `Signed in as ${auth.email}` : 'Signed in by email'}
                </Text>
                <Text step="caption" tone={auth.sessionExpired ? 'negative' : 'tertiary'} tabular={false} accessibilityLiveRegion="polite">
                  {auth.sessionExpired ? 'Signed out on the server. Sign in again to keep syncing; nothing on this iPhone is lost.' : syncLine(sync)}
                </Text>
              </View>
              {auth.sessionExpired ? <Button label="Sign in again" onPress={() => router.push('/sign-in')} /> : null}
              {sync.rejected > 0 ? (
                <View style={{ gap: space[2] }}>
                  <Text step="caption" tone="negative" tabular={false}>
                    {`${plural(sync.rejected, 'item')} couldn't sync.`}
                  </Text>
                  <Button label="Retry" variant="secondary" size="md" onPress={() => void retryRejected()} />
                </View>
              ) : null}
              <Button label={busy === 'signout' ? 'Signing out…' : 'Sign out'} variant="secondary" disabled={busy != null} onPress={() => void askSignOut()} />
              <Button label={busy === 'delete' ? 'Deleting…' : 'Delete account'} variant="secondary" destructive disabled={busy != null} onPress={() => void askDelete()} />
            </Card>
          </>
        ) : null}

        {auth.status === 'local' ? (
          <>
            <SectionLabel>Account</SectionLabel>
            <Card padding="roomy" style={{ gap: space[3] }}>
              <View style={{ gap: 2 }}>
                <Text step="bodyStrong">Not signed in</Text>
                <Text step="label" tone="secondary">
                  Your rounds are saved on this iPhone. Sign in to back them up and use them on another phone.
                </Text>
              </View>
              <Button label="Sign in to back up and sync" onPress={() => router.push('/sign-in')} />
            </Card>
          </>
        ) : null}

        <SectionLabel style={{ marginTop: signedIn || auth.status === 'local' ? space[3] : 0 }}>Feel</SectionLabel>
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
            {signedIn ? 'Merge a backup file with your account.' : 'Replace everything on this iPhone with a backup file.'}
          </Text>
          <Button label={busy === 'import' ? 'Reading…' : 'Restore from backup'} variant="secondary" disabled={busy != null} onPress={() => void restore()} />
        </Card>
        <Card padding="roomy" variant="outlined">
          <Text step="bodyStrong">Clear all data</Text>
          <Text step="label" tone="secondary" style={{ marginTop: 2, marginBottom: space[3] }}>
            {signedIn ? 'Rounds, courses and players, here and in your account. Settings stay.' : 'Rounds, courses and players on this iPhone. Settings stay.'}
          </Text>
          <Button label={busy === 'clear' ? 'Clearing…' : 'Clear all data'} variant="secondary" destructive disabled={busy != null} onPress={() => void clear()} />
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
          <Button label="Read the privacy policy" variant="secondary" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
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
