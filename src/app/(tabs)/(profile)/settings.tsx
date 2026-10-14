import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { actionSheet, ask, confirm, Icon, ListItem, ListSection, ScrollScreen, SegmentedControl, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { clearAllData, exportBackup, importBackup, useAuthStore, useMe, usePreferences, useRoundStore, useSyncStatus } from '@/store';
import { describeBackup, parseBackup } from '@/lib/backup';
import { ALLOWANCE_OPTIONS } from '@/lib/handicap';
import { formatShortDate, plural } from '@/lib/format';
import { analyticsAvailable, deleteAccount, PRIVACY_POLICY_URL, restoreWithSync, retryRejected, signOut, SUPPORT_URL, track } from '@/services';

type Busy = 'export' | 'import' | 'clear' | 'signout' | 'delete' | null;

/**
 * Settings, as one grouped list: the account; what new rounds start with; haptics; your data (back up, restore,
 * clear); privacy choices; help; and about.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { c, space } = useTheme();
  const inProgress = useRoundStore((s) => s.round?.status === 'in-progress');
  const haptics = usePreferences((s) => s.haptics);
  const defaultStakeLabel = usePreferences((s) => s.defaultStakeLabel);
  const defaultAllowance = usePreferences((s) => s.defaultAllowance);
  const crashReports = usePreferences((s) => s.crashReports);
  const analytics = usePreferences((s) => s.analytics === true);
  const updatePreferences = usePreferences((s) => s.update);
  const [labelMode, setLabelMode] = useState<'points' | 'custom'>(defaultStakeLabel === 'points' ? 'points' : 'custom');
  const [customLabel, setCustomLabel] = useState(defaultStakeLabel === 'points' ? '' : defaultStakeLabel);

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

  const chooseAllowance = async () => {
    const i = await actionSheet('Handicap allowance', ALLOWANCE_OPTIONS.map((a) => ({ label: `${a}%` })));
    const a = i != null ? ALLOWANCE_OPTIONS[i] : undefined;
    if (a != null) updatePreferences({ defaultAllowance: a });
  };

  return (
    <ScrollScreen title="Settings" gap={space[6]}>
      {signedIn ? (
        <ListSection header="Account" footer={auth.sessionExpired ? 'Signed out on the server. Sign in again to keep syncing; nothing on this iPhone is lost.' : syncLine(sync)}>
          <ListItem title={me?.name ?? 'Signed in'} subtitle={auth.method === 'apple' ? 'Signed in with Apple' : auth.email ? `Signed in as ${auth.email}` : 'Signed in by email'} />
          {auth.sessionExpired ? <ListItem title="Sign in again" action onPress={() => router.push('/sign-in')} /> : null}
          {sync.rejected > 0 ? <ListItem title={`${plural(sync.rejected, 'item')} couldn't sync.`} value="Retry" accessibilityLabel="Retry" onPress={() => void retryRejected()} accessory="none" /> : null}
          <ListItem title={busy === 'signout' ? 'Signing out…' : 'Sign out'} action disabled={busy != null} onPress={() => void askSignOut()} accessibilityLabel="Sign out" />
          <ListItem title={busy === 'delete' ? 'Deleting…' : 'Delete account'} destructive disabled={busy != null} onPress={() => void askDelete()} accessibilityLabel="Delete account" />
        </ListSection>
      ) : null}

      {auth.status === 'local' ? (
        <ListSection header="Account" footer="Your rounds are saved on this iPhone. Sign in to back them up and use them on another phone.">
          <ListItem title="Not signed in" />
          <ListItem title="Sign in to back up and sync" action onPress={() => router.push('/sign-in')} />
        </ListSection>
      ) : null}

      <ListSection header="New rounds start with" footer="Points are a tally between players. Nothing is paid in the app.">
        <ListItem
          title="Points are called"
          trailing={
            <SegmentedControl
              accessibilityLabel="Points are called"
              options={[
                { value: 'points', label: 'Points' },
                { value: 'custom', label: 'Other' },
              ]}
              value={labelMode}
              onChange={(next) => {
                setLabelMode(next);
                if (next === 'points') updatePreferences({ defaultStakeLabel: 'points' });
                else if (customLabel.trim()) updatePreferences({ defaultStakeLabel: customLabel.trim() });
              }}
              style={{ width: 150 }}
            />
          }
        />
        {labelMode === 'custom' ? (
          <View style={{ paddingHorizontal: space[4], paddingVertical: space[2] }}>
            <TextField
              placeholder="e.g. beers, pushups"
              value={customLabel}
              maxLength={8}
              autoCapitalize="none"
              onChangeText={(v) => {
                setCustomLabel(v);
                if (v.trim()) updatePreferences({ defaultStakeLabel: v.trim() });
              }}
              accessibilityLabel="What the points are called"
            />
          </View>
        ) : null}
        <ListItem title="Handicap allowance" value={`${defaultAllowance}%`} onPress={() => void chooseAllowance()} />
      </ListSection>

      <ListSection>
        <ListItem title="Haptics" accessory={{ switch: haptics, onChange: (v) => updatePreferences({ haptics: v }) }} />
      </ListSection>

      <ListSection header="Your data" footer={message ?? (signedIn ? 'Restore merges a backup with your account. Clear all data deletes rounds, courses and players here and in your account; settings stay.' : 'Restore replaces everything on this iPhone with a backup. Settings stay when you clear your data.')}>
        <ListItem title={busy === 'export' ? 'Preparing…' : 'Back up'} subtitle="One file with every round, course and player." disabled={busy != null} onPress={() => void backUp()} accessibilityLabel="Back up data" />
        <ListItem title={busy === 'import' ? 'Reading…' : 'Restore from a backup'} disabled={busy != null} onPress={() => void restore()} accessibilityLabel="Restore from backup" />
        <ListItem title={busy === 'clear' ? 'Clearing…' : 'Clear all data'} destructive disabled={busy != null} onPress={() => void clear()} accessibilityLabel="Clear all data" />
      </ListSection>

      <ListSection header="Privacy" footer="Crash reports and usage counts are anonymous: never names, scores or courses.">
        <ListItem title="Crash reports" accessory={{ switch: crashReports, onChange: (v) => updatePreferences({ crashReports: v }) }} />
        {analyticsAvailable() ? <ListItem title="Usage analytics" accessory={{ switch: analytics, onChange: (v) => updatePreferences({ analytics: v }) }} /> : null}
        <ListItem title="Privacy policy" trailing={<Icon name="external" size={14} color={c.textTertiary} />} accessory="none" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} accessibilityLabel="Read the privacy policy" accessibilityHint="Opens the website" />
      </ListSection>

      <ListSection header="Help">
        <ListItem title="How it works" onPress={() => router.push('/onboarding')} />
        <ListItem title="Contact support" trailing={<Icon name="external" size={14} color={c.textTertiary} />} accessory="none" onPress={() => void Linking.openURL(SUPPORT_URL)} accessibilityHint="Opens the website" />
      </ListSection>

      <ListSection header="About">
        <ListItem title="Diagnostics" subtitle="Version, storage and sync details for support." onPress={() => router.push('/diagnostics')} />
      </ListSection>
    </ScrollScreen>
  );
}

/** "Synced just now" / "Offline · 3 changes waiting" for the Account section. */
function syncLine(s: { phase: string; pending: number; lastSyncedAt?: string }): string {
  if (s.phase === 'syncing') return 'Syncing…';
  if (s.phase === 'offline') return s.pending ? `Offline · ${s.pending} ${s.pending === 1 ? 'change' : 'changes'} waiting` : 'Offline';
  if (s.phase === 'error') return s.pending ? `Couldn't sync · ${s.pending} waiting, will retry` : "Couldn't sync, will retry";
  if (!s.lastSyncedAt) return 'Not synced yet';
  const mins = Math.round((Date.now() - new Date(s.lastSyncedAt).getTime()) / 60000);
  return mins < 1 ? 'Synced just now' : mins < 60 ? `Synced ${mins} min ago` : `Synced ${formatShortDate(s.lastSyncedAt)}`;
}
