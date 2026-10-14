import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip, ListItem, ListSection, SegmentedControl, SheetScreen, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { targetFrom, useGamesTarget } from '@/store';
import { ALLOWANCE_OPTIONS, holesInPlay } from '@/lib/handicap';

/** Round options: handicap allowance, what the points are called, and a shotgun start hole (until the first score). */
export default function RoundOptionsSheet() {
  const router = useRouter();
  const { space } = useTheme();
  const params = useLocalSearchParams<{ target?: string }>();
  const target = targetFrom(params.target);
  const { course, settings, scored, setSettings } = useGamesTarget(target);
  const [custom, setCustom] = useState(settings.stakeLabel === 'points' ? '' : settings.stakeLabel);
  const [mode, setMode] = useState<'points' | 'custom'>(settings.stakeLabel === 'points' ? 'points' : 'custom');
  const close = () => (router.canGoBack() ? router.back() : router.replace(target === 'round' ? '/round/play' : '/play'));
  const holes = course ? holesInPlay(course, settings.holeCount, settings.nine) : [];
  const startHole = settings.startHole ?? holes[0]?.number ?? 1;

  return (
    <SheetScreen title="Round options" onClose={close}>
      <ListSection header="Handicap allowance" footer="The share of each player's course handicap they receive as strokes.">
        {ALLOWANCE_OPTIONS.map((a) => (
          <ListItem key={a} title={`${a}%`} accessory={settings.allowance === a ? 'check' : 'none'} selected={settings.allowance === a} onPress={() => setSettings({ allowance: a })} />
        ))}
      </ListSection>

      <ListSection header="Points are called" footer="Points are a tally between players. Nothing is paid in the app.">
        <View style={{ padding: space[3], gap: space[3] }}>
          <SegmentedControl
            accessibilityLabel="Points are called"
            options={[
              { value: 'points', label: 'Points' },
              { value: 'custom', label: 'Something else' },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              if (next === 'points') setSettings({ stakeLabel: 'points' });
              else if (custom.trim()) setSettings({ stakeLabel: custom.trim() });
            }}
          />
          {mode === 'custom' ? (
            <TextField
              placeholder="e.g. beers, pushups"
              value={custom}
              maxLength={8}
              autoCapitalize="none"
              onChangeText={(v) => {
                setCustom(v);
                if (v.trim()) setSettings({ stakeLabel: v.trim() });
              }}
              accessibilityLabel="What the points are called"
            />
          ) : null}
        </View>
      </ListSection>

      {holes.length > 0 ? (
        <ListSection header="Start hole" footer={scored ? 'Locked after the first score.' : 'For a shotgun start: the round runs on from this hole.'}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], padding: space[3] }}>
            {holes.map((h) => (
              <Chip
                key={h.number}
                label={String(h.number)}
                accessibilityLabel={`Start on hole ${h.number}`}
                selected={h.number === startHole}
                disabled={scored}
                onPress={() => setSettings({ startHole: h.number === holes[0]?.number ? undefined : h.number })}
                style={{ width: 48, paddingHorizontal: 0 }}
              />
            ))}
          </View>
        </ListSection>
      ) : null}
    </SheetScreen>
  );
}
