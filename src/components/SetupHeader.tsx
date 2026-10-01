import { View } from 'react-native';
import type { Href } from 'expo-router';
import { goBackOr } from '@/components/navigation';
import { useTheme } from '@/theme';
import { IconButton, Text } from '@/components/ui';

export interface SetupHeaderProps {
  title: string;
  /** Right-aligned context, e.g. "Step 1 of 3". */
  meta?: string;
  /** Line under the title, e.g. "Cedar Hollow · White tees · 18 of 18 holes". */
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Where Back goes when there is no screen to pop (deep link / refresh). Defaults to Home. */
  fallback?: Href | '/';
}

/** 48pt circular back button + display title, used on every setup screen and the summary. */
export function SetupHeader({ title, meta, subtitle, showBack = true, onBack, fallback = '/' }: SetupHeaderProps) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: subtitle ? 'flex-start' : 'center', gap: space[3], paddingTop: space[3], paddingBottom: space[4] }}>
      {showBack ? <IconButton icon="chevron-back" label="Back" onPress={onBack ?? (() => goBackOr(fallback))} /> : null}
      <View style={{ flex: 1 }}>
        <Text step="display" numberOfLines={1} style={{ fontSize: 26, lineHeight: 31 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text step="label" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text step="caption" tone="tertiary" tabular={false} numberOfLines={1} style={{ paddingTop: subtitle ? 10 : 0 }}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
