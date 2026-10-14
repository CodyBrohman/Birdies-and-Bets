import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, ListItem, ListSection, SheetScreen, Text } from '@/components/ui';
import { CourseRow } from '@/components/CourseRow';
import { useTheme } from '@/theme';
import { useCourseStore, usePreferences, useRoundStore } from '@/store';
import type { Course } from '@/types';

/** Choose the course for the round being set up: recent and saved courses, filtered as you type. */
export default function ChooseCourseSheet() {
  const router = useRouter();
  const { c, t, space } = useTheme();
  const draft = useRoundStore((s) => s.draft);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  // Subscribing to the saved list re-renders when a course is added or edited.
  useCourseStore((s) => s.userCourses);
  const recentIds = useCourseStore((s) => s.recentIds);
  const allCourses = useCourseStore((s) => s.allCourses);
  const markRecent = useCourseStore((s) => s.markRecent);
  const homeCourseId = usePreferences((s) => s.homeCourseId);
  const [query, setQuery] = useState('');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/play'));
  const all = allCourses();
  const q = query.trim().toLowerCase();
  const match = (k: Course) => !q || k.name.toLowerCase().includes(q) || (k.location ?? '').toLowerCase().includes(q);
  const home = all.find((k) => k.id === homeCourseId && match(k));
  const recent = recentIds.map((id) => all.find((k) => k.id === id)).filter((k): k is Course => !!k && match(k) && k !== home);
  const saved = all.filter((k) => match(k) && !recent.includes(k) && k !== home);

  const choose = (course: Course) => {
    const tee = course.teeBoxes.find((x) => x.id === draft.teeBoxId) ?? course.teeBoxes[0];
    if (!tee) return;
    setDraftCourse(course, tee.id);
    void markRecent(course.id);
    close();
  };
  const row = (k: Course) => <CourseRow key={k.id} course={k} accessory={draft.course?.id === k.id ? 'check' : 'none'} selected={draft.course?.id === k.id} onPress={() => choose(k)} testID={`course-${k.id}`} />;

  return (
    <SheetScreen title="Course" onClose={close} closeLabel="Cancel">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44, paddingHorizontal: space[3], borderRadius: 10, backgroundColor: c.surfaceRaised2 }}>
        <Icon name="search" size="sm" color={c.textTertiary} />
        <TextInput
          accessibilityLabel="Search your courses"
          placeholder="Search your courses"
          placeholderTextColor={c.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{ flex: 1, color: c.textPrimary, fontSize: t.rowBody.fontSize, paddingVertical: space[2] }}
        />
      </View>
      {home ? <ListSection header="Home course">{row(home)}</ListSection> : null}
      {recent.length > 0 ? <ListSection header="Recently played">{recent.map(row)}</ListSection> : null}
      {saved.length > 0 ? <ListSection header={recent.length > 0 ? 'Saved' : 'Courses'}>{saved.map(row)}</ListSection> : null}
      {!home && recent.length + saved.length === 0 ? (
        <Text step="subhead" tone="secondary" align="center" style={{ paddingVertical: space[4] }}>
          {`No saved course matches “${query.trim()}”.`}
        </Text>
      ) : null}
      <ListSection footer="The course directory on the Courses tab finds courses you haven't saved yet.">
        <ListItem title="Add a course" action onPress={() => router.push('/new-round/add-course')} />
        <ListItem
          title="Search the course directory"
          onPress={() => {
            close();
            router.navigate('/courses');
          }}
        />
      </ListSection>
    </SheetScreen>
  );
}
