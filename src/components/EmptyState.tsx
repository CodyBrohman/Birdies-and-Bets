import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  body?: string;
  /** Primary action, full width. */
  action?: { label: string; onPress: () => void };
  /** Quieter second action under the first. */
  secondary?: { label: string; onPress: () => void };
  /** Centre in the remaining space (a whole screen) instead of sitting inline in a list. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One voice for every "nothing here yet": green-tint disc with an outline glyph, serif headline, a line of help, the next step. */
export function EmptyState({ icon, title, body, action, secondary, fill, style }: EmptyStateProps) {
  const { c, space, radius, hit } = useTheme();
  return (
    <View style={[{ alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: fill ? 0 : space[5] }, fill ? { flex: 1, justifyContent: 'center' } : null, style]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 64, height: 64, borderRadius: radius.pill, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: space[1] }}>
        <Ionicons name={icon} size={hit.iconMd} color={c.accentTintText} />
      </View>
      <Text step="headline" align="center">
        {title}
      </Text>
      {body ? (
        <Text tone="secondary" align="center" style={{ maxWidth: 320 }}>
          {body}
        </Text>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={{ alignSelf: 'stretch', marginTop: space[2] }} /> : null}
      {secondary ? <Button label={secondary.label} variant="tinted" size="md" onPress={secondary.onPress} /> : null}
    </View>
  );
}
