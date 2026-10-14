import { View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export interface ResultCalloutProps {
  /** "Maya won", "Maya and Sam tied", "Alex shot 84". */
  title: string;
  /** "Net 70 (−2) · Gross 82". */
  detail?: string | null;
  /** One more fact, e.g. the points leader. */
  extra?: string | null;
}

/** The headline result of a round, first on Results and on a round's page. Read by VoiceOver as one header. */
export function ResultCallout({ title, detail, extra }: ResultCalloutProps) {
  const { c, space } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={[title, detail, extra].filter(Boolean).join('. ')}
      style={{ flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: 14, backgroundColor: c.accentTint }}
    >
      <Icon name="trophy" size="md" filled color={c.accentTintText} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text step="title2" style={{ color: c.accentTintText }}>
          {title}
        </Text>
        {detail ? (
          <Text step="callout" tabular style={{ color: c.accentTintText }}>
            {detail}
          </Text>
        ) : null}
        {extra ? (
          <Text step="subhead" style={{ color: c.accentTintText }}>
            {extra}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
