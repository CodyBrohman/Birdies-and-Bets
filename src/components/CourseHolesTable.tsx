import { View } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Course } from '@/types';

/**
 * A course's holes as a table: HOLE · PAR · SI · YDS (for one set of tees), with OUT after the front nine and IN and
 * TOT after the back. Each row is one VoiceOver element.
 */
export function CourseHolesTable({ course, teeId }: { course: Course; teeId?: string }) {
  const { c, w, space } = useTheme();
  const holes = [...course.holes].sort((a, b) => a.number - b.number);
  const yards = (n: number) => holes.find((h) => h.number === n)?.yardage?.[teeId ?? ''];
  const hasYards = holes.some((h) => h.yardage?.[teeId ?? ''] != null);
  const front = holes.filter((h) => h.number <= 9);
  const back = holes.filter((h) => h.number > 9);

  const cols = (cells: (string | number | undefined)[], opts: { header?: boolean; total?: boolean; label: string; key?: string }) => (
    <View
      key={opts.key}
      accessible
      accessibilityLabel={opts.label}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: opts.header ? 32 : 40, borderTopWidth: opts.header ? 0 : 1, borderTopColor: c.divider, backgroundColor: opts.total ? c.surfaceRaised2 : 'transparent', paddingHorizontal: space[4] }}
    >
      {cells.map((v, i) =>
        opts.header ? (
          <Text key={i} step="tableHeader" tone="tertiary" align={i === 0 ? 'left' : 'right'} style={{ flex: 1 }}>
            {String(v ?? '')}
          </Text>
        ) : (
          <Text key={i} step="rowBody" tabular align={i === 0 ? 'left' : 'right'} style={{ flex: 1, fontWeight: opts.total || i === 0 ? w.semibold : w.regular }}>
            {v == null ? '–' : String(v)}
          </Text>
        ),
      )}
    </View>
  );
  const total = (label: string, set: typeof holes) => {
    const par = set.reduce((n, h) => n + h.par, 0);
    const ys = set.map((h) => yards(h.number));
    const yds = ys.every((y) => y != null) ? ys.reduce<number>((n, y) => n + (y ?? 0), 0) : undefined;
    return cols([label, par, '', hasYards ? yds?.toLocaleString('en-US') : undefined].slice(0, hasYards ? 4 : 3), { total: true, key: label, label: `${label}: par ${par}${yds ? `, ${yds} yards` : ''}` });
  };
  const holeRow = (h: (typeof holes)[number]) =>
    cols([h.number, h.par, h.strokeIndex, hasYards ? yards(h.number) : undefined].slice(0, hasYards ? 4 : 3), {
      key: String(h.number),
      label: `Hole ${h.number}: par ${h.par}, stroke index ${h.strokeIndex}${hasYards && yards(h.number) ? `, ${yards(h.number)} yards` : ''}`,
    });

  return (
    <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{cols(['Hole', 'Par', 'SI', 'Yds'].slice(0, hasYards ? 4 : 3), { header: true, label: '' })}</View>
      {front.map(holeRow)}
      {front.length ? total('Out', front) : null}
      {back.map(holeRow)}
      {back.length ? total('In', back) : null}
      {front.length && back.length ? total('Tot', holes) : null}
    </View>
  );
}
