import type { ReactNode } from 'react';
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';
import { interaction, stateTransition } from './interaction';

export interface HeroCardProps {
  /** Photo behind the content, darkened toward the bottom. Without one the card is dark forest. */
  image?: ImageSourcePropType;
  /** Frosted pill with a gold dot ("READY WHEN YOU ARE"). */
  pill?: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void };
  /** Photo height above the content. */
  height?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** The Home hero: a golf photo with the next round written over it and one full-width action. */
export function HeroCard({ image, pill, title, subtitle, cta, height = 270, children, style }: HeroCardProps) {
  const { c, f, radius, space } = useTheme();
  return (
    <View style={[{ borderRadius: radius.hero, overflow: 'hidden', backgroundColor: c.hero, minHeight: height, justifyContent: 'flex-end' }, style]}>
      {image ? (
        <>
          <Image source={image} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
          <Scrim />
        </>
      ) : null}
      <View style={{ padding: space[4], gap: space[2] }}>
        {pill ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: c.goldFill }} />
            <Text step="overline" style={{ color: c.onHero, fontSize: 10 }}>
              {pill}
            </Text>
          </View>
        ) : null}
        <Text step="headline" style={{ color: c.onHero, fontSize: 24, lineHeight: 29, fontFamily: f.uiBold, letterSpacing: -0.5 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text step="caption" tabular={false} style={{ color: c.onHeroSoft, fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
        {cta ? <Button label={cta.label} variant="hero" icon="arrow-forward" onPress={cta.onPress} style={{ marginTop: space[3] }} /> : null}
      </View>
    </View>
  );
}

const SCRIM_STEPS = 18;

/** A smooth dark fade from the middle of the photo to the bottom, built from thin bands (no gradient dependency). */
function Scrim() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,32,26,0.12)' }} />
      {Array.from({ length: SCRIM_STEPS }, (_, i) => {
        const t = (i + 1) / SCRIM_STEPS;
        return <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${30 + t * 70}%`, bottom: 0, backgroundColor: `rgba(14,32,26,${(0.62 / SCRIM_STEPS).toFixed(3)})` }} />;
      })}
    </View>
  );
}

export interface PhotoCardProps {
  image: ImageSourcePropType;
  /** White pill at the top left ("Great views"). */
  tag?: string;
  /** Gold check at the bottom right of the photo (this course is picked for the round). */
  checked?: boolean;
  title: string;
  /** Right of the title (rating, holes). */
  titleTrailing?: ReactNode;
  subtitle?: string;
  /** Dot-separated facts in the footer ("Par 72", "18 holes"). */
  facts?: string[];
  onPress?: () => void;
  /** Course options (edit, duplicate). */
  onLongPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Course card: photo on top, name and town, facts with an arrow disc. */
export function PhotoCard({ image, tag, checked, title, titleTrailing, subtitle, facts, onPress, onLongPress, accessibilityLabel, style }: PhotoCardProps) {
  const { c, e, f, radius, space } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected: !!checked }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={(s) => {
        const { pressed, hovered } = interaction(s);
        return [
          { borderRadius: radius.hero, overflow: 'hidden', backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.divider, ...(pressed || hovered ? e.lifted : e.raised), opacity: pressed ? 0.9 : 1 } as ViewStyle,
          stateTransition,
          style,
        ];
      }}
    >
      <View style={{ height: 150, backgroundColor: c.hero }}>
        <Image source={image} resizeMode="cover" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
        {tag ? (
          <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: c.surfaceRaised, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text step="caption" tabular={false} style={{ fontFamily: f.uiBold, fontSize: 11, lineHeight: 14, color: c.textPrimary }}>
              {tag}
            </Text>
          </View>
        ) : null}
        {checked ? (
          <View style={{ position: 'absolute', right: 12, bottom: 10, width: 30, height: 30, borderRadius: 999, backgroundColor: c.goldFill, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={18} color={c.textPrimary} />
          </View>
        ) : null}
      </View>
      <View style={{ padding: space[4], gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[2] }}>
          <Text step="title" style={{ flex: 1, fontSize: 17, lineHeight: 22 }} numberOfLines={2}>
            {title}
          </Text>
          {titleTrailing}
        </View>
        {subtitle ? (
          <Text step="caption" tone="tertiary" tabular={false} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {facts?.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space[3] }}>
            <Text step="caption" tone="tertiary" style={{ flex: 1, fontFamily: f.uiSemibold, fontSize: 12 }} numberOfLines={1}>
              {facts.join('  ·  ')}
            </Text>
            <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-forward" size={14} color={c.onAccent} />
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export interface StickyBarProps {
  eyebrow: string;
  title: string;
  actionLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** The dark "ON YOUR ROUND · Eagles Nest Golf Club · Continue" bar that floats above the tab bar. */
export function StickyBar({ eyebrow, title, actionLabel, onPress, style }: StickyBarProps) {
  const { c, f, radius, space } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.hero, borderRadius: radius.xl, paddingLeft: space[4], paddingRight: space[2], paddingVertical: space[2], boxShadow: '0 8px 24px rgba(23,55,45,0.25)' } as ViewStyle, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text step="eyebrow" style={{ color: c.onHeroSoft, fontSize: 10 }}>
          {eyebrow}
        </Text>
        <Text step="label" numberOfLines={1} style={{ color: c.onHero, fontFamily: f.uiBold }}>
          {title}
        </Text>
      </View>
      <Button label={actionLabel} variant="hero" size="md" icon="arrow-forward" onPress={onPress} />
    </View>
  );
}
