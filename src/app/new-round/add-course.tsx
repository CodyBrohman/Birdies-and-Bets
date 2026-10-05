import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Chip, Footer, IconButton, Screen, Segmented, Sheet, Text, TextField, Toggle } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { goBackOr } from '@/components/navigation';
import { useTheme } from '@/theme';
import { useCourseStore, useRoundStore } from '@/store';
import type { Course, Hole, HoleCount, TeeBox } from '@/types';
import { newId } from '@/lib/id';
import { validateCourse } from '@/lib/courseImport';
import { checkStrokeIndexes, parseNumber, parWarning, strokeIndexesInHoleOrder, uniqueCourseName, validateTee, yardageProblem, yardageTotals } from '@/lib/courseEditor';
import { track } from '@/services';

interface HoleDraft {
  par: 3 | 4 | 5 | 6;
  si: string;
  /** Yardage text per tee id. */
  yards: Record<string, string>;
}

interface TeeDraft {
  id: string;
  name: string;
  rating: string;
  slope: string;
}

const MAX_TEES = 3;

interface EditorDraft {
  name: string;
  tees: TeeDraft[];
  holeCount: HoleCount;
  holes: HoleDraft[];
  yardages: boolean;
}

function blankDraft(): EditorDraft {
  return {
    name: '',
    tees: [{ id: newId('tee'), name: 'White', rating: '', slope: '' }],
    holeCount: 18,
    holes: Array.from({ length: 18 }, (_, i) => ({ par: 4, si: String(i + 1), yards: {} })),
    yardages: false,
  };
}

/** Editor state from a course. For a copy, tees get fresh ids so the yardage columns are independent of the source. */
function draftFrom(course: Course, copy: boolean, name: string): EditorDraft {
  const teeIds = new Map(course.teeBoxes.map((t) => [t.id, copy ? newId('tee') : t.id]));
  const holes: HoleDraft[] = Array.from({ length: 18 }, (_, i) => {
    const h = course.holes.find((x) => x.number === i + 1);
    const yards: Record<string, string> = {};
    for (const t of course.teeBoxes) if (h?.yardage?.[t.id] != null) yards[teeIds.get(t.id)!] = String(h.yardage[t.id]);
    return { par: (h?.par as HoleDraft['par']) ?? 4, si: String(h?.strokeIndex ?? i + 1), yards };
  });
  return {
    name,
    tees: course.teeBoxes.map((t) => ({ id: teeIds.get(t.id)!, name: t.name, rating: t.rating != null ? String(t.rating) : '', slope: t.slope != null ? String(t.slope) : '' })),
    holeCount: course.holes.length >= 18 ? 18 : 9,
    holes,
    yardages: course.holes.some((h) => h.yardage && Object.keys(h.yardage).length > 0),
  };
}

/**
 * Manual course entry, editing and duplicating. Name, one to three tees with optional rating/slope, then par chips,
 * stroke index and optional yardages per hole. Every field validates as you type; Save is enabled only when the
 * card can be scored.
 */
export default function AddCourseScreen() {
  const router = useRouter();
  const { id, duplicate } = useLocalSearchParams<{ id?: string; duplicate?: string }>();
  const { c, space } = useTheme();
  const byId = useCourseStore((s) => s.byId);
  const allCourses = useCourseStore((s) => s.allCourses);
  const addUserCourse = useCourseStore((s) => s.addUserCourse);
  const updateUserCourse = useCourseStore((s) => s.updateUserCourse);
  const removeUserCourse = useCourseStore((s) => s.removeUserCourse);
  const markRecent = useCourseStore((s) => s.markRecent);
  const draft = useRoundStore((s) => s.draft);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  const setDraftSettings = useRoundStore((s) => s.setDraftSettings);

  const source = id ? byId(id) : undefined;
  const copying = !!source && duplicate === '1';
  const editing = !!source && !copying && !!source.userEntered;
  const [initial] = useState<EditorDraft>(() => (source && (copying || editing) ? draftFrom(source, copying, copying ? uniqueCourseName(source.name, allCourses()) : source.name) : blankDraft()));
  const [name, setName] = useState(initial.name);
  const [tees, setTees] = useState<TeeDraft[]>(initial.tees);
  const [holeCount, setHoleCount] = useState<HoleCount>(initial.holeCount);
  const [holes, setHoles] = useState<HoleDraft[]>(initial.holes);
  const [yardages, setYardages] = useState(initial.yardages);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const visibleHoles = holes.slice(0, holeCount);
  const pars = visibleHoles.map((h) => h.par);
  const totalPar = pars.reduce((s, p) => s + p, 0);
  const frontPar = pars.slice(0, 9).reduce((s, p) => s + p, 0);
  const backPar = pars.slice(9).reduce((s, p) => s + p, 0);
  const parNote = useMemo(() => parWarning(pars), [pars]);

  const si = useMemo(() => checkStrokeIndexes(visibleHoles.map((h) => h.si), holeCount), [visibleHoles, holeCount]);
  const siInOrder = visibleHoles.every((h, i) => h.si === String(i + 1));
  const teeProblems = useMemo(() => tees.map(validateTee), [tees]);
  const teesOk = teeProblems.every((p) => !p.name && !p.rating && !p.slope);
  const yardsOk = !yardages || visibleHoles.every((h) => tees.every((t) => !yardageProblem(h.yards[t.id] ?? '')));
  const totals = useMemo(() => (yardages ? yardageTotals(visibleHoles, tees.map((t) => t.id)) : {}), [yardages, visibleHoles, tees]);
  const nameTaken = useMemo(() => {
    const n = name.trim().toLowerCase();
    return !!n && allCourses().some((k) => k.name.trim().toLowerCase() === n && !(editing && k.id === source?.id));
  }, [name, allCourses, editing, source]);

  const canSave = name.trim().length > 0 && !nameTaken && !si.message && teesOk && yardsOk;
  const blocker = !name.trim() ? 'Name the course to continue' : nameTaken ? 'A course with that name is already saved' : !teesOk ? 'Fix the tee details above' : si.message ? 'Fix the stroke indexes above' : !yardsOk ? 'Fix the yardages above' : null;

  const setHole = (i: number, patch: Partial<HoleDraft>) => setHoles((hs) => hs.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const setTee = (i: number, patch: Partial<TeeDraft>) => setTees((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const resetStrokeIndexes = () => {
    const order = strokeIndexesInHoleOrder(holeCount);
    setHoles((hs) => hs.map((h, i) => (i < holeCount ? { ...h, si: order[i] } : h)));
  };

  const build = (): Course => {
    const num = (s: string) => {
      const n = parseNumber(s);
      return n == null || Number.isNaN(n) ? undefined : n;
    };
    const teeBoxes: TeeBox[] = tees.map((t) => ({ id: t.id, name: t.name.trim() || 'Tees', ...(num(t.rating) != null ? { rating: num(t.rating) } : {}), ...(num(t.slope) != null ? { slope: num(t.slope) } : {}) }));
    const courseHoles = visibleHoles.map<Hole>((h, i) => {
      const yardage: Record<string, number> = {};
      if (yardages) for (const t of tees) if (num(h.yards[t.id] ?? '') != null) yardage[t.id] = num(h.yards[t.id]!)!;
      return { number: i + 1, par: h.par, strokeIndex: Number(h.si), ...(Object.keys(yardage).length ? { yardage } : {}) };
    });
    for (const t of teeBoxes) {
      const ys = courseHoles.map((h) => h.yardage?.[t.id]).filter((y): y is number => y != null);
      if (ys.length === courseHoles.length) t.totalYards = ys.reduce((a, b) => a + b, 0);
    }
    if (editing && source) {
      return { ...source, name: name.trim(), userEntered: true, source: source.source ?? 'user', teeBoxes, holes: courseHoles };
    }
    return {
      id: newId('course'),
      name: name.trim(),
      ...(copying && source?.location ? { location: source.location } : {}),
      userEntered: true,
      source: 'user',
      teeBoxes,
      holes: courseHoles,
    };
  };

  const save = async () => {
    if (!canSave) return;
    setSaveError(null);
    const course = build();
    const problems = validateCourse(course);
    if (problems.length) {
      setSaveError(problems.join('. '));
      return;
    }
    if (editing) {
      await updateUserCourse(course);
      if (draft.course?.id === course.id) setDraftCourse(course, course.teeBoxes.some((t) => t.id === draft.teeBoxId) ? draft.teeBoxId! : course.teeBoxes[0]!.id);
      goBackOr('/courses');
      return;
    }
    await addUserCourse(course);
    track('course_created');
    void markRecent(course.id);
    setDraftSettings({ holeCount, nine: 'front', startHole: undefined });
    setDraftCourse(course, course.teeBoxes[0]!.id);
    router.dismissTo('/bet');
  };

  const del = async () => {
    if (!source) return;
    await removeUserCourse(source.id);
    setConfirmDelete(false);
    goBackOr('/courses');
  };

  const title = editing ? 'Edit course' : copying ? 'Duplicate course' : 'Add course';
  const parMeta = holeCount === 18 ? `Par ${totalPar} (${frontPar} / ${backPar})` : `Par ${totalPar}`;

  return (
    <Screen noBottomInset>
      <SetupHeader title={title} meta={parMeta} fallback="/courses" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[4] }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          {copying && source ? (
            <Text step="body" tone="secondary">
              Copy of {source.name}.
            </Text>
          ) : null}
          <TextField placeholder="Course name" value={name} onChangeText={setName} accessibilityLabel="Course name" autoCapitalize="words" style={nameTaken ? { borderColor: c.negative } : undefined} />
          {nameTaken ? <Problem>A course with that name is already saved.</Problem> : null}

          {tees.map((t, i) => {
            const p = teeProblems[i];
            return (
              <View key={t.id} style={{ gap: space[1] }}>
                <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                  <TextField style={[{ flex: 1 }, p.name ? { borderColor: c.negative } : null]} placeholder="Tee" value={t.name} onChangeText={(v) => setTee(i, { name: v })} accessibilityLabel={`Tee ${i + 1} name`} autoCapitalize="words" />
                  <TextField style={[{ width: 88 }, p.rating ? { borderColor: c.negative } : null]} placeholder="Rating" value={t.rating} onChangeText={(v) => setTee(i, { rating: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" maxLength={5} accessibilityLabel={`Tee ${i + 1} rating`} />
                  <TextField style={[{ width: 80 }, p.slope ? { borderColor: c.negative } : null]} placeholder="Slope" value={t.slope} onChangeText={(v) => setTee(i, { slope: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" maxLength={3} accessibilityLabel={`Tee ${i + 1} slope`} />
                  {tees.length > 1 ? <IconButton icon="close" label={`Remove tee ${i + 1}`} variant="plain" size={40} onPress={() => setTees((ts) => ts.filter((_, j) => j !== i))} /> : null}
                </View>
                {p.name || p.rating || p.slope ? <Problem>{[p.name, p.rating, p.slope].filter(Boolean).join('. ')}</Problem> : null}
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
            <Text step="caption" tone="tertiary" tabular={false} style={{ flex: 1 }}>
              Rating and slope optional.
            </Text>
            {tees.length < MAX_TEES ? <Button label="Add tee" variant="secondary" size="md" onPress={() => setTees((ts) => [...ts, { id: newId('tee'), name: '', rating: '', slope: '' }])} /> : null}
          </View>

          {!editing ? (
            <Segmented
              options={[
                { value: '18', label: '18 holes' },
                { value: '9', label: '9 holes' },
              ]}
              value={String(holeCount)}
              onChange={(v) => setHoleCount(v === '9' ? 9 : 18)}
              accessibilityLabel="Hole count"
            />
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text step="bodyStrong">Yardages</Text>
            <Toggle value={yardages} onChange={setYardages} accessibilityLabel="Enter yardages per hole" />
          </View>

          <Card padding="dense">
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[1], height: 32, gap: space[2] }}>
              <Text step="overline" tone="tertiary" style={{ width: 40 }}>
                Hole
              </Text>
              <Text step="overline" tone="tertiary" style={{ flex: 1 }}>
                Par
              </Text>
              <Text step="overline" tone="tertiary" style={{ width: 64 }}>
                SI
              </Text>
            </View>
            {visibleHoles.map((h, i) => (
              <View key={i} style={{ paddingHorizontal: space[1], paddingVertical: space[2], borderTopWidth: 1, borderTopColor: c.dividerSoft, gap: space[2] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <Text step="total" style={{ width: 40 }}>
                    {i + 1}
                  </Text>
                  <View style={{ flex: 1, flexDirection: 'row', gap: space[1] }}>
                    {([3, 4, 5, 6] as const).map((p) => (
                      <Chip key={p} label={String(p)} accessibilityLabel={`Par ${p}`} selected={h.par === p} onPress={() => setHole(i, { par: p })} haptic={false} style={{ paddingHorizontal: 0, width: 44 }} />
                    ))}
                  </View>
                  <TextField
                    style={[{ width: 64, height: 44 }, si.badHoles.has(i) ? { borderColor: c.negative, borderWidth: 1.5 } : null]}
                    inputStyle={{ textAlign: 'center' }}
                    value={h.si}
                    onChangeText={(v) => setHole(i, { si: v.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel={`Hole ${i + 1} stroke index`}
                    selectTextOnFocus
                  />
                </View>
                {yardages ? (
                  <View style={{ flexDirection: 'row', gap: space[2], paddingLeft: 48 }}>
                    {tees.map((t) => {
                      const bad = !!yardageProblem(h.yards[t.id] ?? '');
                      return (
                        <TextField
                          key={t.id}
                          style={[{ flex: 1, height: 40 }, bad ? { borderColor: c.negative, borderWidth: 1.5 } : null]}
                          inputStyle={{ textAlign: 'center' }}
                          placeholder={t.name || 'yds'}
                          value={h.yards[t.id] ?? ''}
                          onChangeText={(v) => setHole(i, { yards: { ...h.yards, [t.id]: v.replace(/[^0-9]/g, '') } })}
                          keyboardType="number-pad"
                          maxLength={3}
                          accessibilityLabel={`Hole ${i + 1} ${t.name} yardage`}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ))}
            {yardages ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[1], paddingTop: space[2], borderTopWidth: 1, borderTopColor: c.dividerSoft }}>
                <Text step="overline" tone="tertiary" style={{ width: 40 }}>
                  Total
                </Text>
                <Text step="label" tone="secondary" tabular style={{ flex: 1 }} numberOfLines={2}>
                  {tees.map((t) => `${t.name || 'Tees'} ${totals[t.id] != null ? `${totals[t.id]!.toLocaleString()} yds` : '—'}`).join(' · ')}
                </Text>
              </View>
            ) : null}
          </Card>

          {si.message ? <Problem>{si.message}</Problem> : null}
          {!yardsOk ? <Problem>Yardages are whole numbers from 50 to 700.</Problem> : null}
          {parNote ? (
            <Text step="label" tone="secondary">
              {parNote}
            </Text>
          ) : null}
          {!siInOrder ? <Button label="Reset stroke index to hole order" variant="secondary" size="md" onPress={resetStrokeIndexes} /> : null}
          {saveError ? <Problem>{saveError}</Problem> : null}

          {editing && source ? (
            <View style={{ gap: space[2], marginTop: space[2] }}>
              <Button label="Duplicate course" variant="secondary" onPress={() => router.replace({ pathname: '/new-round/add-course', params: { id: source.id, duplicate: '1' } })} />
              <Button label="Delete course" variant="secondary" destructive onPress={() => setConfirmDelete(true)} />
            </View>
          ) : null}
        </ScrollView>
        <Footer>
          {blocker ? (
            <Text step="caption" tone="tertiary" tabular={false} align="center">
              {blocker}
            </Text>
          ) : null}
          <Button label={editing ? 'Save changes' : copying ? 'Save copy and choose players' : 'Save and choose players'} disabled={!canSave} onPress={() => void save()} />
        </Footer>
      </KeyboardAvoidingView>
      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this course?" subtitle="Played rounds keep their copy.">
        <View style={{ gap: space[2] }}>
          <Button label="Delete" onPress={() => void del()} />
          <Button label="Keep it" variant="secondary" onPress={() => setConfirmDelete(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

/** Validation copy. Announced by VoiceOver as it appears; the red field border is the visual cue. */
function Problem({ children }: { children: string }) {
  return (
    <Text step="label" tone="negative" tabular={false} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}
