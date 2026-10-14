import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { ListItem, ListSection, ScrollScreen } from '@/components/ui';
import { useTheme } from '@/theme';
import { SCHEMA_VERSION, storageBackend, useAuthStore, useSyncStatus } from '@/store';
import { formatShortDate } from '@/lib/format';

/** The details support asks for: version and build, the update running, storage, the data schema and sync. */
export default function DiagnosticsScreen() {
  const { space } = useTheme();
  const auth = useAuthStore((s) => s.status);
  const sync = useSyncStatus();
  return (
    <ScrollScreen title="Diagnostics" gap={space[6]}>
      <ListSection header="App" footer="Send these with a support request if something looks wrong.">
        <ListItem title="Version" value={Constants.expoConfig?.version ?? '—'} />
        <ListItem title="Build" value={Constants.expoConfig?.ios?.buildNumber ?? '—'} />
        <ListItem title="Update" value={Updates.updateId ? Updates.updateId.slice(0, 8) : 'Built in'} />
        <ListItem title="Channel" value={Updates.channel ?? '—'} />
      </ListSection>
      <ListSection header="Data">
        <ListItem title="Storage" value={storageBackend === 'mmkv' ? 'MMKV' : 'AsyncStorage'} />
        <ListItem title="Data schema" value={String(SCHEMA_VERSION)} />
        <ListItem title="Account" value={auth === 'signed-in' ? 'Signed in' : auth === 'local' ? 'On this iPhone' : auth === 'disabled' ? 'Not available' : 'Signed out'} />
        <ListItem title="Sync" value={sync.phase === 'idle' ? (sync.lastSyncedAt ? `Synced ${formatShortDate(sync.lastSyncedAt)}` : 'Idle') : sync.phase} />
        <ListItem title="Waiting to sync" value={String(sync.pending)} />
      </ListSection>
    </ScrollScreen>
  );
}
