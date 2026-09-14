import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Sheet, Text, TextField } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { useTheme } from '@/theme';
import { useCourseStore, useRoundStore } from '@/store';
import type { Course, TeeBox } from '@/types';
import { parFor } from '@/lib/handicap';

/** Course select: search, add-your-course, recently played, all courses. Tee sheet on row tap. */
export default function CourseScreen() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const [query, setQuery] = useState('');
  const [teeFor, setTeeFor] = useState<Course | null>(null);

  const search = useCourseStore((s) => s.search);
  const userCourses = useCourseStore((s) => s.userCourses);
  const recentIds = useCourseStore((s) => s.recentIds);
  const recent = useCourseStore((s) => s.recent);
  const markRecent = useCourseStore((s) => s.markRecent);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);

  // userCourses/recentIds in deps so the memo refreshes after hydration or an add.
  const results = useMemo(() => search(query), [search, query, userCourses, recentIds]);
  const recentList = useMemo(() => (query ? [] : recent()), [recent, query, recentIds, userCourses]);
  const others = results.filter((r) => !recentList.some((x) => x.id === r.id));

  const chooseTee = (tee: TeeBox) => {
    if (!teeFor) return;
    setDraftCourse(teeFor, tee.id);
    void markRecent(teeFor.id);
    setTeeFor(null);
    router.push('/new-round/players');
  };

  return (
    <Screen noBottomInset>
      <SetupHeader title="Course" />
      <TextField
        variant="search"
        placeholder="Search courses"
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search courses"
        returnKeyType="search"
      />
      <ScrollView contentContainerStyle={{ paddingVertical: space[4], gap: space[5] }} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add your course"
          onPress={() => router.push('/new-round/add-course')}
          style={({ pressed }) => ({
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            padding: space[3],
            backgroundColor: c.accentTint,
            borderWidth: 1.5,
            borderColor: c.accent,
            borderRadius: radius.lg,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text step="headline" tone="onAccent">
              +
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text step="bodyStrong">Add your course</Text>
            <Text step="label" tone="secondary">
              Enter pars and stroke index by hand
            </Text>
          </View>
          <Text step="headline" tone="secondary">
            ›
          </Text>
        </Pressable>

        {recentList.length > 0 ? <Section title="Recently played" courses={recentList} onPress={setTeeFor} /> : null}
        {others.length > 0 ? <Section title={query ? 'Results' : 'Courses'} courses={others} onPress={setTeeFor} /> : null}
        {others.length === 0 && recentList.length === 0 ? (
          <Text tone="secondary" align="center">
            No course matches "{query}". Add it above — it takes about a minute.
          </Text>
        ) : null}
      </ScrollView>

      <Sheet visible={teeFor != null} onClose={() => setTeeFor(null)} title={teeFor?.name ?? ''} subtitle="Choose your tees">
        <View style={{ gap: space[2] }}>
          {teeFor?.teeBoxes.map((tee) => (
            <Pressable
              key={tee.id}
              accessibilityRole="button"
              accessibilityLabel={`${tee.name} tees`}
              onPress={() => chooseTee(tee)}
              style={({ pressed }) => ({
                height: 60,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
                paddingHorizontal: space[3],
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: pressed ? c.accent : c.divider,
                backgroundColor: pressed ? c.accentTint : c.surface,
              })}
            >
              <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: tee.color ?? c.divider, borderWidth: 1, borderColor: c.divider }} />
              <Text step="bodyStrong" style={{ flex: 1 }}>
                {tee.name}
              </Text>
              <Text step="label" tone="secondary" tabular>
                {tee.totalYards ? `${tee.totalYards.toLocaleString()} yds` : '—'}
              </Text>
              <Text step="label" tone="secondary" tabular>
                {tee.rating?.toFixed(1) ?? '—'}
              </Text>
              <Text step="label" tone="secondary" tabular>
                {tee.slope ?? '—'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function Section({ title, courses, onPress }: { title: string; courses: Course[]; onPress: (c: Course) => void }) {
  const { c, space, radius } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <Text step="label" tone="secondary">
        {title}
      </Text>
      {courses.map((course) => (
        <Pressable
          key={course.id}
          accessibilityRole="button"
          accessibilityLabel={course.name}
          onPress={() => onPress(course)}
          style={({ pressed }) => ({
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            paddingHorizontal: space[4],
            paddingVertical: space[3],
            backgroundColor: pressed ? c.accentTint : c.surfaceRaised,
            borderWidth: pressed ? 1.5 : 1,
            borderColor: pressed ? c.accent : c.divider,
            borderRadius: radius.lg,
          })}
        >
          <View style={{ flex: 1 }}>
            <Text step="bodyStrong" numberOfLines={1}>
              {course.name}
            </Text>
            <Text step="label" tone="secondary" numberOfLines={1}>
              {course.location ?? (course.userEntered ? 'Your course' : '')}
            </Text>
          </View>
          <Text step="bodyStrong" tone="secondary" tabular>
            Par {parFor(course.holes)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
