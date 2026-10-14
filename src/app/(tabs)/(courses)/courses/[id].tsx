import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { actionSheet, Button, confirm, HeaderButton, ListItem, ListSection, ScrollScreen, SegmentedControl, Text } from '@/components/ui';
import { CourseHolesTable } from '@/components/CourseHolesTable';
import { RoundRow } from '@/components/round';
import { goBackOr } from '@/components/navigation';
import { useTheme } from '@/theme';
import { useCourseStats, useCourseStore, useHistoryInsights, useHistoryStore, useMe, useRoundStore } from '@/store';
import { courseSummary } from '@/lib/courseInfo';
import { formatShortDate, joinMeta, plural } from '@/lib/format';

/** A course: its tees, its holes (par, stroke index, yards), your rounds there, and Play this course. */
export default function CoursePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c, space } = useTheme();
  const course = useCourseStore((s) => s.byId)(id ?? '');
  useCourseStore((s) => s.userCourses);
  const markRecent = useCourseStore((s) => s.markRecent);
  const removeUserCourse = useCourseStore((s) => s.removeUserCourse);
  const draft = useRoundStore((s) => s.draft);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  const entries = useHistoryStore((s) => s.entries);
  const insights = useHistoryInsights();
  const stats = useCourseStats();
  const { me } = useMe();
  const meRef = useMemo(() => (me ? { id: me.id, name: me.name } : undefined), [me]);
  const [teeId, setTeeId] = useState<string | undefined>(undefined);

  if (!course) {
    return (
      <ScrollScreen title="Course">
        <Text step="rowBody" tone="secondary">
          That course is no longer saved.
        </Text>
      </ScrollScreen>
    );
  }

  const tee = course.teeBoxes.find((t) => t.id === teeId) ?? course.teeBoxes.find((t) => t.id === draft.teeBoxId) ?? course.teeBoxes[0];
  const stat = stats.get(course.id);
  const roundIds = new Set(entries.filter((e) => e.round?.course.id === course.id).map((e) => e.summary.id));
  const here = insights.filter((i) => roundIds.has(i.summary.id));

  const play = () => {
    if (!tee) return;
    setDraftCourse(course, tee.id);
    void markRecent(course.id);
    router.navigate('/play');
  };
  const del = async () => {
    if (!(await confirm({ title: `Delete ${course.name}?`, message: 'Rounds already played there keep their own copy.', confirmLabel: 'Delete course', destructive: true }))) return;
    await removeUserCourse(course.id);
    goBackOr('/courses');
  };
  const menu = async () => {
    const items = [
      ...(course.userEntered ? [{ label: 'Edit course', run: () => router.push({ pathname: '/new-round/add-course', params: { id: course.id } }) }] : []),
      { label: 'Duplicate and edit', run: () => router.push({ pathname: '/new-round/add-course', params: { id: course.id, duplicate: '1' } }) },
      ...(course.userEntered ? [{ label: 'Delete course', destructive: true, run: () => void del() }] : []),
    ];
    const i = await actionSheet(course.name, items);
    if (i != null) items[i]?.run();
  };

  return (
    <ScrollScreen
      title={course.name}
      gap={space[6]}
      headerRight={() => <HeaderButton label="Course options" icon="more" onPress={() => void menu()} />}
      footer={<Button label="Play this course" onPress={play} testID="play-course" />}
    >
      <View style={{ gap: space[1] }}>
        <Text accessibilityRole="header" step="title2">
          {course.name}
        </Text>
        <Text step="subhead" tone="secondary">
          {courseSummary(course)}
        </Text>
        {stat ? (
          <Text step="subhead" tone="secondary">
            {joinMeta([plural(stat.rounds, 'round'), stat.best != null ? `your best ${stat.best}` : null, `last played ${formatShortDate(stat.last)}`])}
          </Text>
        ) : null}
      </View>

      <ListSection header="Tees">
        {course.teeBoxes.map((t) => (
          <ListItem
            key={t.id}
            title={t.name}
            subtitle={t.rating ? `Rating ${t.rating.toFixed(1)} · Slope ${t.slope ?? '—'}` : 'No rating or slope'}
            value={t.totalYards ? `${t.totalYards.toLocaleString('en-US')} yds` : undefined}
            leading={<View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: t.color ?? c.tickUpcoming, borderWidth: 1, borderColor: c.dividerSoft }} />}
          />
        ))}
      </ListSection>

      <View style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text accessibilityRole="header" step="title3" style={{ flex: 1 }}>
            Holes
          </Text>
          {course.teeBoxes.length > 1 && course.holes.some((h) => h.yardage) ? (
            <SegmentedControl accessibilityLabel="Yards from" options={course.teeBoxes.slice(0, 4).map((t) => ({ value: t.id, label: t.name }))} value={tee?.id ?? course.teeBoxes[0]!.id} onChange={setTeeId} style={{ minWidth: 160 }} />
          ) : null}
        </View>
        <CourseHolesTable course={course} teeId={tee?.id} />
      </View>

      {here.length > 0 ? (
        <ListSection header="Your rounds here" headerVariant="large">
          {here.slice(0, 10).map((i) => (
            <RoundRow key={i.summary.id} insight={i} me={meRef} onPress={() => router.push({ pathname: '/history/[id]', params: { id: i.summary.id } })} />
          ))}
        </ListSection>
      ) : null}
    </ScrollScreen>
  );
}
