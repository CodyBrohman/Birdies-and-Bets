import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Chip, IconTile, PhotoCard, Screen, ScreenHeader, Sheet, StickyBar, Text, TextField, Pressable } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { AreaSheet } from '@/components/AreaSheet';
import { courseFacts, coursePhoto, courseTag } from '@/components/courseArt';
import { useTheme } from '@/theme';
import { useCourseStore, usePreferences, useRoundStore, type CourseSearchResult } from '@/store';
import { courseSearchAvailable, fetchCourse, searchCourses } from '@/services';
import type { Course } from '@/types';
import { joinMeta, plural } from '@/lib/format';

type Filter = 'all' | 'recent' | 'yours';

/** Courses: where you browse, the search, and photo cards. Tapping one puts it on your round and opens Bet. */
export default function CoursesScreen() {
  const router = useRouter();
  const { c, f, space, layout } = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [areaOpen, setAreaOpen] = useState(false);
  const [optionsFor, setOptionsFor] = useState<Course | null>(null);

  const search = useCourseStore((s) => s.search);
  const userCourses = useCourseStore((s) => s.userCourses);
  const recentIds = useCourseStore((s) => s.recentIds);
  const markRecent = useCourseStore((s) => s.markRecent);
  const importCourse = useCourseStore((s) => s.importCourse);
  const cachedSearch = useCourseStore((s) => s.cachedSearch);
  const cacheSearch = useCourseStore((s) => s.cacheSearch);
  const draft = useRoundStore((s) => s.draft);
  const round = useRoundStore((s) => s.round);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  const homeArea = usePreferences((s) => s.homeArea);

  // userCourses/recentIds in deps so the list refreshes after hydration or an add.
  const all = useMemo(() => search(query), [search, query, userCourses, recentIds]);
  const list = useMemo(() => {
    const ranked = [...all].sort((a, b) => rank(a) - rank(b));
    if (filter === 'recent') return ranked.filter((x) => recentIds.includes(x.id));
    if (filter === 'yours') return ranked.filter((x) => x.userEntered);
    return ranked;
    function rank(x: Course) {
      const i = recentIds.indexOf(x.id);
      return i === -1 ? 100 : i;
    }
  }, [all, filter, recentIds]);

  // Remote search: debounced, cached, quiet when offline or not configured.
  const [remote, setRemote] = useState<CourseSearchResult[]>([]);
  const [remoteState, setRemoteState] = useState<'idle' | 'searching' | 'error'>('idle');
  const [importing, setImporting] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    abortRef.current?.abort();
    const q = query.trim();
    if (!courseSearchAvailable() || q.length < 3) {
      setRemote([]);
      setRemoteState('idle');
      return;
    }
    const cached = cachedSearch(q);
    if (cached) {
      setRemote(cached);
      setRemoteState('idle');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setRemoteState('searching');
    const timer = setTimeout(() => {
      searchCourses(q, controller.signal)
        .then((r) => {
          if (controller.signal.aborted) return;
          cacheSearch(q, r);
          setRemote(r);
          setRemoteState('idle');
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteState('error');
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, cachedSearch, cacheSearch]);

  const choose = (course: Course) => {
    const tee = course.teeBoxes.find((t) => t.id === draft.teeBoxId) ?? course.teeBoxes[0];
    if (!tee) return;
    setDraftCourse(course, tee.id);
    void markRecent(course.id);
    router.navigate('/bet');
  };
  const importAndChoose = async (r: CourseSearchResult) => {
    setImportError(null);
    setImporting(r.providerId);
    try {
      const course = await fetchCourse(r.providerId);
      await importCourse(course);
      setQuery('');
      choose(course);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not load that course.');
    } finally {
      setImporting(null);
    }
  };
  const alreadyImported = (r: CourseSearchResult) => userCourses.find((u) => u.providerId === r.providerId);

  const live = round && round.status === 'in-progress' ? round : null;
  const sticky = live
    ? { title: live.course.name, onPress: () => router.push('/round/play') }
    : draft.course
      ? { title: draft.course.name, onPress: () => router.navigate('/bet') }
      : null;

  return (
    <Screen noBottomInset>
      <ScrollView contentContainerStyle={{ gap: layout.stack, paddingTop: space[6], paddingBottom: sticky ? 96 : layout.section }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="The local loop" title="Find your fairway." subtitle="Good tracks, a little closer to home." style={{ marginBottom: space[2] }} />

        <Card variant="tinted" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <IconTile icon="navigate-outline" tone="white" />
          <View style={{ flex: 1 }}>
            <Text step="eyebrow" tone="tertiary" style={{ fontSize: 10 }}>
              Browsing near
            </Text>
            <Text step="title" numberOfLines={1}>
              {homeArea ?? 'Anywhere'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Set your area" onPress={() => setAreaOpen(true)} hitSlop={12} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
            <Text step="label" style={{ fontFamily: f.uiBold, color: c.accentTintText, fontSize: 13 }}>
              {homeArea ? 'Change area' : 'Set my area'}
            </Text>
            <Ionicons name="arrow-up-outline" size={14} color={c.accentTintText} style={{ transform: [{ rotate: '45deg' }] }} />
          </Pressable>
        </Card>

        <TextField
          variant="search"
          placeholder="Search a course or town"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search courses"
          returnKeyType="search"
          leading={<Ionicons name="search-outline" size={20} color={c.textTertiary} />}
        />

        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          <Chip label="All courses" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Recent" selected={filter === 'recent'} onPress={() => setFilter('recent')} />
          <Chip label="Yours" selected={filter === 'yours'} onPress={() => setFilter('yours')} />
        </View>

        <View style={{ marginTop: space[3], gap: 2 }}>
          <Text accessibilityRole="header" step="headline">
            {list.length ? `${plural(list.length, 'course')} to explore` : query ? 'No saved matches' : 'Nothing here yet'}
          </Text>
          <Text step="caption" tone="tertiary" tabular={false}>
            {homeArea ? `Saved on this phone · ${homeArea}` : 'Saved on this phone'}
          </Text>
        </View>

        {list.map((course) => (
          <PhotoCard
            key={course.id}
            image={coursePhoto(course.id)}
            tag={courseTag(course, recentIds)}
            checked={draft.course?.id === course.id}
            title={course.name}
            titleTrailing={
              <Text step="label" tone="secondary" style={{ fontFamily: f.uiBold }}>
                {course.teeBoxes[0]?.rating ? `${course.teeBoxes[0].rating.toFixed(1)} / ${course.teeBoxes[0].slope ?? '—'}` : ''}
              </Text>
            }
            subtitle={course.location ?? (course.userEntered ? 'Added by you' : 'Bundled course')}
            facts={courseFacts(course)}
            accessibilityLabel={`${course.name}. ${courseFacts(course).join(', ')}. Play here.`}
            onPress={() => choose(course)}
            onLongPress={() => setOptionsFor(course)}
          />
        ))}

        {list.length === 0 && remote.length === 0 && remoteState === 'idle' ? (
          <EmptyState icon="location-outline" title={query ? `No saved course matches “${query}”.` : 'No courses in this list yet.'} body="Add it by hand instead." action={{ label: 'Add your course', onPress: () => router.push('/new-round/add-course') }} />
        ) : null}

        {remote.length > 0 || remoteState !== 'idle' ? (
          <View style={{ gap: layout.stack, marginTop: space[3] }}>
            <Text accessibilityRole="header" step="headline">
              More courses
            </Text>
            {remoteState === 'searching' && remote.length === 0 ? (
              <Text step="label" tone="tertiary">
                Searching…
              </Text>
            ) : null}
            {remoteState === 'error' ? (
              <Text step="label" tone="tertiary">
                Search is offline. Saved courses still work.
              </Text>
            ) : null}
            {remote.map((r) => {
              const have = alreadyImported(r);
              return (
                <Card key={r.providerId} accessibilityLabel={`${have ? 'Use' : 'Download'} ${r.name}`} disabled={importing != null} onPress={() => (have ? choose(have) : void importAndChoose(r))} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                  {importing === r.providerId ? (
                    <View style={{ width: 44, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={c.accent} />
                    </View>
                  ) : (
                    <IconTile icon={have ? 'checkmark-outline' : 'cloud-download-outline'} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text step="title" numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text step="caption" tone="tertiary" tabular={false} numberOfLines={1}>
                      {joinMeta([r.location, r.holeCount ? `${r.holeCount} holes` : null, importing === r.providerId ? 'Loading…' : null])}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={c.textPrimary} />
                </Card>
              );
            })}
            {importError ? (
              <Text step="caption" tone="negative" tabular={false}>
                {importError}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Card onPress={() => router.push('/new-round/add-course')} accessibilityLabel="Add your course" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <IconTile icon="add" />
          <View style={{ flex: 1 }}>
            <Text step="title">Add your course</Text>
            <Text step="caption" tone="tertiary" tabular={false}>
              Pars, stroke index and tees, by hand.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={c.textPrimary} />
        </Card>
      </ScrollView>

      {sticky ? <StickyBar eyebrow={live ? 'Round in play' : 'On your round'} title={sticky.title} actionLabel="Continue" onPress={sticky.onPress} style={{ position: 'absolute', left: 20, right: 20, bottom: 12 }} /> : null}

      <AreaSheet visible={areaOpen} onClose={() => setAreaOpen(false)} />

      <Sheet visible={!!optionsFor} onClose={() => setOptionsFor(null)} title={optionsFor?.name} subtitle={optionsFor ? courseFacts(optionsFor).join(' · ') : undefined}>
        <View style={{ gap: space[2] }}>
          {optionsFor ? <Button label="Play this course" icon="arrow-forward" onPress={() => (setOptionsFor(null), choose(optionsFor))} /> : null}
          {optionsFor?.userEntered ? (
            <Button label="Edit course" variant="secondary" icon="create-outline" onPress={() => (setOptionsFor(null), router.push({ pathname: '/new-round/add-course', params: { id: optionsFor.id } }))} />
          ) : null}
          {optionsFor ? <Button label="Duplicate and edit" variant="secondary" icon="copy-outline" onPress={() => (setOptionsFor(null), router.push({ pathname: '/new-round/add-course', params: { id: optionsFor.id, duplicate: '1' } }))} /> : null}
        </View>
      </Sheet>
    </Screen>
  );
}
