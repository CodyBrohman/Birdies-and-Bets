import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  /** Position in the group; picks the tint from a four-colour palette (sage, sand, slate, rose). */
  index: number;
  size?: number;
  /** Local photo URI; initials when absent. */
  photoUri?: string;
  /** A ring in the ground colour, for overlapping stacks. */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** "MC", "JL": two initials, bold forest, on a soft tint. */
export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

/** Initials in a tinted disc, or the profile photo. */
export function Avatar({ name, index, size = 40, photoUri, ring, style }: AvatarProps) {
  const { c, f } = useTheme();
  const fills = [c.avatarA, c.avatarB, c.avatarC, c.avatarD];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: fills[Math.abs(index) % fills.length],
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          ...(ring ? { borderWidth: 2, borderColor: c.surfaceRaised } : null),
        },
        style,
      ]}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
      ) : !name.trim() || name === '?' ? (
        <Ionicons name="person-outline" size={Math.round(size * 0.45)} color={c.avatarText} />
      ) : (
        <Text style={{ color: c.avatarText, fontFamily: f.uiBold, fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.46) }} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {avatarInitials(name)}
        </Text>
      )}
    </View>
  );
}

/** Overlapping avatars with a "+n" disc ("Your circle"). */
export function AvatarStack({ names, max = 3, size = 30 }: { names: string[]; max?: number; size?: number }) {
  const { c, f } = useTheme();
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} index={i} size={size} ring style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }} />
      ))}
      {extra > 0 ? (
        <View style={{ width: size, height: size, borderRadius: 999, marginLeft: -size * 0.3, backgroundColor: c.neutralChip, borderWidth: 2, borderColor: c.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.textPrimary, fontFamily: f.uiSemibold, fontSize: 11 }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}
