import { ScrollView, View } from 'react-native';
import { Chip, Sheet, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Hole, RoundSettings } from '@/types';
import { AllowanceField, FieldRow, StakeLabelField } from './SettingsFields';

export interface RoundSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  settings: RoundSettings;
  /** Holes in play, natural order (for the start-hole picker). */
  holes: Hole[];
  /** False once scores exist: the start hole is locked. */
  allowStartHole: boolean;
  onChange: (patch: Partial<RoundSettings>) => void;
}

/** Stake label, handicap allowance and (before the first score) a shotgun start hole. */
export function RoundSettingsSheet({ visible, onClose, settings, holes, allowStartHole, onChange }: RoundSettingsSheetProps) {
  const { space } = useTheme();
  const startHole = settings.startHole ?? holes[0]?.number ?? 1;

  return (
    <Sheet visible={visible} onClose={onClose} title="Round settings" actionLabel="Done">
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space[5], paddingBottom: space[2] }}>
        <StakeLabelField value={settings.stakeLabel} onChange={(stakeLabel) => onChange({ stakeLabel })} />
        <AllowanceField value={settings.allowance} onChange={(allowance) => onChange({ allowance })} />

        <FieldRow label="Start hole" help={allowStartHole ? undefined : 'Locked after the first score'}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {holes.map((h) => (
              <Chip
                key={h.number}
                label={String(h.number)}
                accessibilityLabel={`Start on hole ${h.number}`}
                selected={h.number === startHole}
                disabled={!allowStartHole}
                haptic={false}
                onPress={() => onChange({ startHole: h.number === holes[0]?.number ? undefined : h.number })}
                style={{ width: 52, paddingHorizontal: 0 }}
              />
            ))}
          </View>
        </FieldRow>
      </ScrollView>
    </Sheet>
  );
}
