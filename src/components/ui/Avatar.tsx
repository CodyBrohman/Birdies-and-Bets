import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { seatColors, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  /**
   * The player's seat in a round (0 = first player): the avatar takes that seat's colour, the same colour the player
   * has in the scorecard, standings and share image. Outside a round, leave it out: one quiet tint for everyone.
   */
  seat?: number;
  size?: number;
  /** Local photo URI; initials when absent. */
  photoUri?: string;
  /** A ring in the cell colour, for overlapping stacks. */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** "MC", "JL": first and last initials. */
export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

/** The seat colour for a player position in a round. Wraps after four, which a round never exceeds. */
export function seatColor(seat: number) {
  return seatColors[Math.abs(seat) % seatColors.length]!;
}

/** Initials in a disc (the seat colour in a round, a quiet tint elsewhere), or the profile photo. Decorative: the name sits beside it. */
export function Avatar({ name, seat, size = 40, photoUri, ring, style }: AvatarProps) {
  const { c, w } = useTheme();
  const tint = seat == null ? { tint: c.accentTint, onTint: c.accentTintText } : seatColor(seat);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: tint.tint,
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
        <Icon name="person" size={Math.round(size * 0.5)} color={tint.onTint} />
      ) : (
        <Text style={{ color: tint.onTint, fontWeight: w.semibold, fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.48) }} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {avatarInitials(name)}
        </Text>
      )}
    </View>
  );
}

/** Overlapping avatars with a "+n" disc. */
export function AvatarStack({ names, max = 3, size = 30 }: { names: string[]; max?: number; size?: number }) {
  const { c, w } = useTheme();
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} ring style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }} />
      ))}
      {extra > 0 ? (
        <View style={{ width: size, height: size, borderRadius: 999, marginLeft: -size * 0.3, backgroundColor: c.neutralChip, borderWidth: 2, borderColor: c.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
          <Text step="caption2" style={{ color: c.textPrimary, fontWeight: w.semibold }}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
