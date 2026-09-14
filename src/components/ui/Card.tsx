import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export type CardEdge = 'none' | 'betting' | 'social';

export interface CardProps extends ViewProps {
  /** Top edge treatment: betting = chip-edge stripe, social = solid positive bar. */
  edge?: CardEdge;
  /** 12 (dense) or 16 (default) padding. */
  dense?: boolean;
  /** Highlight with accentTint fill and accent border (selected / pressed state). */
  selected?: boolean;
}

/** Raised surface, radius 14, hairline divider. The container for nearly everything. */
export function Card({ edge = 'none', dense, selected, style, children, ...rest }: CardProps) {
  const { c, e, radius, space } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: selected ? c.accentTint : c.surfaceRaised,
          borderColor: selected ? c.accent : c.divider,
          borderWidth: selected ? 1.5 : 1,
          borderRadius: radius.lg,
          overflow: 'hidden',
          ...e.raised,
        },
        style,
      ]}
    >
      {edge !== 'none' ? <Edge kind={edge} /> : null}
      <View style={{ padding: dense ? space[3] : space[4] }}>{children}</View>
    </View>
  );
}

/** Betting cards get a poker-chip edge stripe (accent / divider alternating); social cards a solid positive bar. */
function Edge({ kind }: { kind: Exclude<CardEdge, 'none'> }) {
  const { c } = useTheme();
  if (kind === 'social') {
    return <View style={{ height: 5, backgroundColor: c.positive }} />;
  }
  const segments = Array.from({ length: 40 }, (_, i) => i);
  return (
    <View style={{ height: 5, flexDirection: 'row', overflow: 'hidden' }}>
      {segments.map((i) => (
        <View key={i} style={{ width: i % 2 === 0 ? 12 : 8, backgroundColor: i % 2 === 0 ? c.accent : c.divider }} />
      ))}
    </View>
  );
}
