import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';

export interface SetupHeaderProps {
  title: string;
  /** Right-aligned context, e.g. "Cedar Ridge · Blue". */
  meta?: string;
  showBack?: boolean;
}

/** 44pt back button + display title, used on every setup screen. */
export function SetupHeader({ title, meta, showBack = true }: SetupHeaderProps) {
  const router = useRouter();
  const { c, hit, radius, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[2] }}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={4}
          style={({ pressed }) => ({
            width: hit.min,
            height: hit.min,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? c.accentTint : 'transparent',
          })}
        >
          <Text step="headline">‹</Text>
        </Pressable>
      ) : null}
      <Text step="display" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {meta ? (
        <Text step="label" tone="secondary" numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
