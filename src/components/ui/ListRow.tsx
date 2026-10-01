import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { interaction, stateTransition } from './interaction';

export interface ListRowProps {
  /** Avatar, IconTile or nothing. */
  leading?: ReactNode;
  title: string;
  /** Inline after the title: a badge or a status dot. */
  titleAccessory?: ReactNode;
  /** Grey line under the title ("HCP 11.2 · On the course now"). */
  meta?: string;
  /** A second line in pine ("Eagles Nest Golf Club"). */
  accent?: string;
  /** Non-interactive content under the text, inside the press area (e.g. a stake line). */
  children?: ReactNode;
  /** Glyph at the right, inside the press area (a check or ⊕ that mirrors the row's own action). */
  trailing?: ReactNode;
  /** Its own control at the right, outside the press area (an IconButton or Button). */
  action?: ReactNode;
  /** Its own controls under the row, outside the press area (inline links), aligned with the text. */
  footer?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** A hairline above (rows grouped in one card). */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * One person, game or setting: leading art, bold title, meta lines, trailing glyph or control. 56pt minimum.
 * Interactive pieces (`action`, `footer`) sit beside the pressable area, never inside it (no nested buttons on web).
 */
export function ListRow({ leading, title, titleAccessory, meta, accent, children, trailing, action, footer, onPress, accessibilityLabel, divider, style }: ListRowProps) {
  const { c, f, space } = useTheme();
  const body = (
    <>
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
          <Text step="title" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {titleAccessory}
        </View>
        {accent ? (
          <Text step="caption" tone="accent" tabular={false} numberOfLines={1} style={{ fontFamily: f.uiSemibold }}>
            {accent}
          </Text>
        ) : null}
        {meta ? (
          <Text step="caption" tone="tertiary" tabular={false} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
        {children}
      </View>
      {trailing}
    </>
  );
  const inner: ViewStyle = { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[3] };
  return (
    <View style={[divider ? { borderTopWidth: 1, borderTopColor: c.divider } : null, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        {onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            onPress={onPress}
            style={(s) => {
              const { pressed } = interaction(s);
              return [inner, stateTransition, { opacity: pressed ? 0.7 : 1 }];
            }}
          >
            {body}
          </Pressable>
        ) : (
          <View style={inner}>{body}</View>
        )}
        {action}
      </View>
      {footer ? <View style={{ paddingLeft: leading ? 56 : 0, paddingBottom: space[3], marginTop: -space[2] }}>{footer}</View> : null}
    </View>
  );
}
