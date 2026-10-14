import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Icon, Pressable, Text } from '@/components/ui';
import { haptic, PRESSED_OPACITY, useTheme } from '@/theme';
import type { Hole } from '@/types';

export type HoleProgress = 'all' | 'some' | 'none';

export interface HoleStripProps {
  /** Holes in play order (a shotgun start begins mid-card). */
  order: Hole[];
  current: number;
  progress: (holeNumber: number) => HoleProgress;
  onSelect: (holeNumber: number) => void;
}

const CHIP = 44;
const GAP = 6;

/**
 * Every hole as a chip, in play order. The current hole is filled pine; a finished hole carries a check and a part-scored
 * one a dot, so progress never rests on colour alone. Scrolls to keep the current hole in view.
 */
export function HoleStrip({ order, current, progress, onSelect }: HoleStripProps) {
  const { c, w } = useTheme();
  const strip = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const index = order.findIndex((h) => h.number === current);

  useEffect(() => {
    if (!width || index < 0) return;
    const x = index * (CHIP + GAP) - (width - CHIP) / 2;
    strip.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [index, width]);

  return (
    <ScrollView
      ref={strip}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      contentContainerStyle={{ gap: GAP }}
      style={{ flexGrow: 0 }}
      accessibilityLabel="Holes"
    >
      {order.map((h) => {
        const on = h.number === current;
        const state = progress(h.number);
        const ink = on ? c.onAccent : state === 'none' ? c.textTertiary : c.textPrimary;
        return (
          <Pressable
            key={h.number}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Hole ${h.number}, par ${h.par}${state === 'all' ? ', scored' : state === 'some' ? ', partly scored' : ''}`}
            onPress={() => {
              if (on) return;
              haptic.selection();
              onSelect(h.number);
            }}
            style={({ pressed }) => ({
              width: CHIP,
              height: 52,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              backgroundColor: on ? c.accent : c.surfaceRaised,
              borderWidth: on ? 0 : 1,
              borderColor: c.divider,
              opacity: pressed ? PRESSED_OPACITY : 1,
            })}
          >
            <Text step="rowTitle" tabular style={{ color: ink, fontWeight: on ? w.bold : w.semibold }} maxFontSizeMultiplier={1.2}>
              {h.number}
            </Text>
            <View style={{ height: 12, alignItems: 'center', justifyContent: 'center' }}>
              {state === 'all' ? <Icon name="check" size={12} color={on ? c.onAccent : c.accent} /> : state === 'some' ? <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: on ? c.onAccent : c.textTertiary }} /> : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
