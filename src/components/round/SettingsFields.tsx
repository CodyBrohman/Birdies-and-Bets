import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Segmented, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { ALLOWANCE_OPTIONS } from '@/lib/handicap';

type StakeChoice = 'points' | '$' | 'custom';

const choiceFor = (label: string): StakeChoice => (label === 'points' ? 'points' : label === '$' ? '$' : 'custom');

export interface StakeLabelFieldProps {
  value: string;
  onChange: (label: string) => void;
  /** Help line under the title; the default explains points. */
  help?: string;
}

/** Points / $ / custom picker for the stake label. Used by Round settings and by the app-wide default. */
export function StakeLabelField({ value, onChange, help }: StakeLabelFieldProps) {
  const { space } = useTheme();
  const [choice, setChoice] = useState<StakeChoice>(choiceFor(value));
  const [custom, setCustom] = useState(choiceFor(value) === 'custom' ? value : '');

  const pick = (next: StakeChoice) => {
    setChoice(next);
    if (next === 'points' || next === '$') onChange(next);
    else if (custom.trim()) onChange(custom.trim());
  };

  return (
    <FieldRow label="Stake label" help={help}>
      <Segmented
        compact
        options={[
          { value: 'points', label: 'Points' },
          { value: '$', label: '$' },
          { value: 'custom', label: 'Custom' },
        ]}
        value={choice}
        onChange={pick}
        accessibilityLabel="Stake label"
      />
      {choice === 'custom' ? (
        <TextField
          style={{ marginTop: space[2], height: 48 }}
          placeholder="e.g. beers"
          value={custom}
          maxLength={8}
          autoCapitalize="none"
          onChangeText={(v) => {
            setCustom(v);
            if (v.trim()) onChange(v.trim());
          }}
          accessibilityLabel="Custom stake label"
        />
      ) : null}
    </FieldRow>
  );
}

export interface AllowanceFieldProps {
  value: number;
  onChange: (allowance: number) => void;
  help?: string;
}

/** 100 / 90 / 85 / 75 handicap allowance. */
export function AllowanceField({ value, onChange, help }: AllowanceFieldProps) {
  const options = ALLOWANCE_OPTIONS.map((a) => ({ value: String(a), label: `${a}%` }));
  const current = (ALLOWANCE_OPTIONS as readonly number[]).includes(value) ? String(value) : String(ALLOWANCE_OPTIONS[0]);
  return (
    <FieldRow label="Handicap allowance" help={help}>
      <Segmented compact options={options} value={current} onChange={(v) => onChange(Number(v))} accessibilityLabel="Handicap allowance" />
    </FieldRow>
  );
}

/** Title, optional help line, then the control. */
export function FieldRow({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <Text step="bodyStrong">{label}</Text>
      {help ? (
        <Text step="caption" tone="secondary" tabular={false}>
          {help}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
