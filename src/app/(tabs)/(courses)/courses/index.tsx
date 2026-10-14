import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { confirm, HeaderButton, ListItem, ListSection, ScrollScreen, SearchField, Text } from '@/components/ui';
import { CourseRow } from '@/components/CourseRow';
import { LiveRoundBanner } from '@/components/round';
import { useTheme } from '@/theme';
import { useCourseStats, useCourseStore, useRoundStore, type CourseSearchResult, type CourseStat } from '@/store';
import { courseSearchAvailable, fetchCourse, searchCourses, track } from '@/services';
import type { Course } from '@/types';
import { formatShortDate, joinMeta } from '@/lib/format';
import { friendlyCourseError } from '@/lib/errors';

/**
 * Courses: recently played and saved courses, identified by their data, and the course directory when you search. A
 * course opens its page; long press for Play, Edit, Duplicate and Delete.
 */
export default function CoursesScreen() {
  const router = useRouter();
  const { c, space } = useTheme();
  const [query, setQuery] = useState('');
  const search = useCourseStore((s) => s.search);
  const userCourses = useCourseStore((s) => s.userCourses);
  const recentIds = useCourseStore((s) => s.recentIds);
  const markRecent = useCourseStore((s) => s.markRecent);
  const importCourse = useCourseStore((s) => s.importCourse);
  const removeUserCourse = useCourseStore((s) => s.removeUserCourse);
  const cachedSearch = useCourseStore((s) => s.cachedSearch);
  const cacheSearch = useCourseStore((s) => s.cacheSearch);
  const draft = useRoundStore((s) => s.draft);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  const stats = useCourseStats();

  // Reading the saved list subscribes to it, so the rows refresh after an add or an edit (search reads the store).
  void userCourses;
  const matches = search(query);
  const recent = recentIds.map((id) => matches.find((k) => k.id === id)).filter((k): k is Course => !!k);
  const saved = matches.filter((k) => !recent.includes(k));

  // The course directory: debounced, cached per query, quiet when offline or not configured.
  const [fetched, setFetched] = useState<{ q: string; results: CourseSearchResult[]; failed?: string } | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const q = query.trim();
  const remoteActive = courseSearchAvailable() && q.length >= 3;
  const cached = remoteActive ? cachedSearch(q) : undefined;
  const current = remoteActive && !cached && fetched?.q === q ? fetched : null;
  const remote = cached ?? current?.results ?? [];
  const remoteState: 'idle' | 'searching' | 'error' = !remoteActive || cached ? 'idle' : !current ? 'searching' : current.failed ? 'error' : 'idle';
  const needsFetch = remoteActive && !cached;
  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchCourses(q, controller.signal)
        .then((r) => {
          if (controller.signal.aborted) return;
          cacheSearch(q, r);
          setFetched({ q, results: r });
        })
        .catch((e: unknown) => {
          if (!controller.signal.aborted) setFetched({ q, results: [], failed: friendlyCourseError(e) });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, needsFetch, cacheSearch]);

  const play = (course: Course) => {
    const tee = course.teeBoxes.find((t) => t.id === draft.teeBoxId) ?? course.teeBoxes[0];
    if (!tee) return;
    setDraftCourse(course, tee.id);
    void markRecent(course.id);
    router.navigate('/play');
  };
  const importAndOpen = async (r: CourseSearchResult) => {
    setImportError(null);
    setImporting(r.providerId);
    try {
      const course = await fetchCourse(r.providerId);
      await importCourse(course);
      track('course_imported');
      setQuery('');
      router.push({ pathname: '/courses/[id]', params: { id: course.id } });
    } catch (e) {
      setImportError(friendlyCourseError(e));
    } finally {
      setImporting(null);
    }
  };
  const del = async (course: Course) => {
    if (await confirm({ title: `Delete ${course.name}?`, message: 'Rounds already played there keep their own copy.', confirmLabel: 'Delete course', destructive: true })) await removeUserCourse(course.id);
  };
  const alreadyImported = (r: CourseSearchResult) => userCourses.find((u) => u.providerId === r.providerId);

  const valueFor = (stat: CourseStat | undefined) => (stat?.best != null ? `Best ${stat.best}` : stat ? formatShortDate(stat.last) : undefined);
  const row = (course: Course) => (
    <CourseRow
      key={course.id}
      course={course}
      value={valueFor(stats.get(course.id))}
      onPress={() => router.push({ pathname: '/courses/[id]', params: { id: course.id } })}
      testID={`course-${course.id}`}
      menu={[
        { label: 'Play this course', onPress: () => play(course) },
        ...(course.userEntered ? [{ label: 'Edit course', onPress: () => router.push({ pathname: '/new-round/add-course', params: { id: course.id } }) }] : []),
        { label: 'Duplicate and edit', onPress: () => router.push({ pathname: '/new-round/add-course', params: { id: course.id, duplicate: '1' } }) },
        ...(course.userEntered ? [{ label: 'Delete course', destructive: true, onPress: () => void del(course) }] : []),
      ]}
    />
  );

  return (
    <ScrollScreen title="Courses" largeTitle gap={space[6]} headerRight={() => <HeaderButton label="Add a course" icon="plus" onPress={() => router.push('/new-round/add-course')} testID="add-course" />}>
      <LiveRoundBanner />
      <SearchField value={query} onChangeText={setQuery} placeholder={courseSearchAvailable() ? 'Search courses or the directory' : 'Search your courses'} accessibilityLabel="Search courses" />

      {recent.length > 0 ? <ListSection header="Recently played">{recent.map(row)}</ListSection> : null}
      {saved.length > 0 ? <ListSection header={recent.length > 0 || q ? 'Saved' : 'Courses'}>{saved.map(row)}</ListSection> : null}
      {q && recent.length + saved.length === 0 ? (
        <Text step="subhead" tone="secondary" align="center">
          {`No saved course matches “${q}”.`}
        </Text>
      ) : null}

      {remoteActive ? (
        <ListSection header="Course directory" footer={importError ?? (remoteState === 'error' ? current?.failed : remote.length ? 'Download a course to play it and keep it here.' : undefined)}>
          {remoteState === 'searching' && remote.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4] }}>
              <ActivityIndicator size="small" color={c.accent} />
              <Text step="rowBody" tone="secondary">
                Searching
              </Text>
            </View>
          ) : null}
          {remote.map((r) => {
            const have = alreadyImported(r);
            return (
              <ListItem
                key={r.providerId}
                title={r.name}
                strong
                subtitle={joinMeta([r.location, r.holeCount ? `${r.holeCount} holes` : null])}
                value={importing === r.providerId ? 'Downloading' : have ? 'Saved' : 'Download'}
                disabled={importing != null}
                onPress={() => (have ? router.push({ pathname: '/courses/[id]', params: { id: have.id } }) : void importAndOpen(r))}
              />
            );
          })}
          {remoteState === 'idle' && remote.length === 0 ? (
            <Text step="rowBody" tone="secondary" style={{ padding: space[4] }}>
              No courses found
            </Text>
          ) : null}
        </ListSection>
      ) : null}

      <ListSection footer="Pars, stroke index and tees, typed in by hand.">
        <ListItem title="Add a course by hand" action onPress={() => router.push('/new-round/add-course')} />
      </ListSection>
    </ScrollScreen>
  );
}
