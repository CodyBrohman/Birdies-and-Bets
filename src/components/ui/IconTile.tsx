import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { Text } from './Text';
import type { IoniconName } from './IconButton';

export interface IconTileProps {
  icon: IoniconName;
  /** sage (default, recessed green-grey), white (on a tinted card), hero (translucent white on a dark card), gold. */
  tone?: 'sage' | 'white' | 'hero' | 'gold';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Rounded-square icon holder: the navigation arrow on "Find your next fairway", game icons, the bag icon. */
export function IconTile({ icon, tone = 'sage', size = 44, style }: IconTileProps) {
  const { c, radius } = useTheme();
  const bg = tone === 'white' ? c.surfaceRaised : tone === 'hero' ? 'rgba(255,255,255,0.12)' : tone === 'gold' ? c.goldTint : c.accentTint;
  const fg = tone === 'hero' ? c.goldFill : tone === 'gold' ? c.goldText : c.textPrimary;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius.lg, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={fg} />
    </View>
  );
}

export interface NoteBarProps {
  icon?: IoniconName;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Sage info strip: "Your profile and bag details are saved on this device." */
export function NoteBar({ icon = 'phone-portrait-outline', children, style }: NoteBarProps) {
  const { c, radius, space } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.accentTint, borderRadius: radius.lg, paddingHorizontal: space[4], paddingVertical: space[3] }, style]}>
      <Ionicons name={icon} size={18} color={c.accentText} />
      <Text step="caption" tabular={false} style={{ flex: 1, color: c.accentTintText }}>
        {children}
      </Text>
    </View>
  );
}
