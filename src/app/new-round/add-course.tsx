import { useMemo, useState, type ComponentProps } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, confirm, FormRow, HeaderButton, ListItem, ListSection, ScrollScreen, SegmentedControl, Text } from '@/components/ui';
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
 * Adding, editing and duplicating a course, as one grouped form: the name; one to three tees with optional rating and
 * slope; 18 or 9 holes; then par, stroke index and (optionally) yardages for each hole. Every field checks itself as
 * you type; Save is on only when the card can be scored.
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
  const blocker = !name.trim() ? 'Name the course to continue.' : nameTaken ? 'A course with that name is already saved.' : !teesOk ? 'Fix the tee details above.' : si.message ? 'Fix the stroke indexes above.' : !yardsOk ? 'Fix the yardages above.' : null;

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
    router.dismissTo('/play');
  };

  const del = async () => {
    if (!source) return;
    const ok = await confirm({ title: `Delete ${source.name}?`, message: 'Rounds already played there keep their own copy.', confirmLabel: 'Delete course', destructive: true });
    if (!ok) return;
    await removeUserCourse(source.id);
    goBackOr('/courses');
  };

  const title = editing ? 'Edit course' : copying ? 'Duplicate course' : 'Add course';
  const parMeta = holeCount === 18 ? `Par ${totalPar} (${frontPar} out, ${backPar} in)` : `Par ${totalPar}`;
  const teeProblem = teeProblems.map((p) => [p.name, p.rating, p.slope].filter(Boolean).join('. ')).find(Boolean);

  return (
    <ScrollScreen
      title={title}
      gap={space[6]}
      headerLeft={() => <HeaderButton label="Cancel" onPress={() => goBackOr('/courses')} />}
      footer={
        <>
          {blocker ? (
            <Text step="footnote" tone="secondary" align="center">
              {blocker}
            </Text>
          ) : null}
          <Button label={editing ? 'Save changes' : 'Save course'} disabled={!canSave} onPress={() => void save()} testID="save-course" />
        </>
      }
    >
      {copying && source ? (
        <Text step="subhead" tone="secondary" style={{ marginBottom: -space[3] }}>
          Copy of {source.name}.
        </Text>
      ) : null}

      <ListSection header="Course" footer={nameTaken ? 'A course with that name is already saved.' : undefined}>
        <FormRow placeholder="Course name" value={name} onChangeText={setName} accessibilityLabel="Course name" autoCapitalize="words" invalid={nameTaken} testID="course-name" />
      </ListSection>

      <ListSection header="Tees" footer={teeProblem ?? 'Rating and slope are optional. Without them everyone plays off scratch.'}>
        {tees.map((t, i) => {
          const p = teeProblems[i]!;
          return (
            <View key={t.id} style={{ paddingLeft: space[4] }}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: c.divider }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 52, paddingRight: space[2] }}>
                <CellInput style={{ flex: 1 }} invalid={!!p.name} placeholder="Tee name" value={t.name} onChangeText={(v) => setTee(i, { name: v })} accessibilityLabel={`Tee ${i + 1} name`} autoCapitalize="words" />
                <CellInput style={{ width: 72 }} invalid={!!p.rating} placeholder="Rating" value={t.rating} onChangeText={(v) => setTee(i, { rating: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" maxLength={5} accessibilityLabel={`Tee ${i + 1} rating`} />
                <CellInput style={{ width: 60 }} invalid={!!p.slope} placeholder="Slope" value={t.slope} onChangeText={(v) => setTee(i, { slope: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" maxLength={3} accessibilityLabel={`Tee ${i + 1} slope`} />
                {tees.length > 1 ? <HeaderButton label={`Remove tee ${i + 1}`} icon="minus" onPress={() => setTees((ts) => ts.filter((_, j) => j !== i))} /> : null}
              </View>
            </View>
          );
        })}
        {tees.length < MAX_TEES ? <ListItem title="Add tee" action onPress={() => setTees((ts) => [...ts, { id: newId('tee'), name: '', rating: '', slope: '' }])} /> : null}
      </ListSection>

      <ListSection header={`Holes · ${parMeta}`} footer={parNote ?? undefined}>
        {!editing ? (
          <ListItem
            title="Holes"
            trailing={
              <SegmentedControl
                accessibilityLabel="Hole count"
                options={[
                  { value: '18', label: '18' },
                  { value: '9', label: '9' },
                ]}
                value={holeCount === 9 ? '9' : '18'}
                onChange={(v) => setHoleCount(v === '9' ? 9 : 18)}
                style={{ width: 120 }}
              />
            }
          />
        ) : null}
        <ListItem title="Yardages per hole" accessory={{ switch: yardages, onChange: setYardages }} accessibilityLabel="Enter yardages per hole" />
      </ListSection>

      <View style={{ gap: space[2] }}>
        <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingHorizontal: space[3] }}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', height: 32, gap: space[2] }}>
            <Text step="tableHeader" tone="tertiary" style={{ width: 32 }}>
              Hole
            </Text>
            <Text step="tableHeader" tone="tertiary" style={{ flex: 1 }}>
              Par
            </Text>
            <Text step="tableHeader" tone="tertiary" align="center" style={{ width: 56 }}>
              SI
            </Text>
          </View>
          {visibleHoles.map((h, i) => (
            <View key={i} style={{ paddingVertical: space[2], borderTopWidth: 1, borderTopColor: c.divider, gap: space[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Text step="rowTitle" tabular style={{ width: 32 }}>
                  {i + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <SegmentedControl
                    accessibilityLabel={`Hole ${i + 1} par`}
                    options={[
                      { value: '3', label: '3' },
                      { value: '4', label: '4' },
                      { value: '5', label: '5' },
                      { value: '6', label: '6' },
                    ]}
                    value={String(h.par) as '3' | '4' | '5' | '6'}
                    onChange={(v) => setHole(i, { par: Number(v) as HoleDraft['par'] })}
                  />
                </View>
                <CellInput
                  style={{ width: 56, textAlign: 'center' }}
                  invalid={si.badHoles.has(i)}
                  value={h.si}
                  onChangeText={(v) => setHole(i, { si: v.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  maxLength={2}
                  accessibilityLabel={`Hole ${i + 1} stroke index`}
                  selectTextOnFocus
                />
              </View>
              {yardages ? (
                <View style={{ flexDirection: 'row', gap: space[2], paddingLeft: 40 }}>
                  {tees.map((t) => (
                    <CellInput
                      key={t.id}
                      style={{ flex: 1, textAlign: 'center' }}
                      invalid={!!yardageProblem(h.yards[t.id] ?? '')}
                      placeholder={`${t.name || 'Tee'} yds`}
                      value={h.yards[t.id] ?? ''}
                      onChangeText={(v) => setHole(i, { yards: { ...h.yards, [t.id]: v.replace(/[^0-9]/g, '') } })}
                      keyboardType="number-pad"
                      maxLength={3}
                      accessibilityLabel={`Hole ${i + 1} ${t.name} yardage`}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {yardages ? (
            <View style={{ paddingVertical: space[3], borderTopWidth: 1, borderTopColor: c.divider }}>
              <Text step="subhead" tone="secondary" tabular>
                {tees.map((t) => `${t.name || 'Tees'} ${totals[t.id] != null ? `${totals[t.id]!.toLocaleString('en-US')} yds` : '—'}`).join(' · ')}
              </Text>
            </View>
          ) : null}
        </View>
        {si.message ? <Problem>{si.message}</Problem> : null}
        {!yardsOk ? <Problem>Yardages are whole numbers from 50 to 700.</Problem> : null}
        {!siInOrder ? <Button label="Reset stroke index to hole order" variant="plain" onPress={resetStrokeIndexes} /> : null}
        {saveError ? <Problem>{saveError}</Problem> : null}
      </View>

      {editing && source ? (
        <ListSection>
          <ListItem title="Duplicate course" action onPress={() => router.replace({ pathname: '/new-round/add-course', params: { id: source.id, duplicate: '1' } })} />
          <ListItem title="Delete course" destructive onPress={() => void del()} />
        </ListSection>
      ) : null}
    </ScrollScreen>
  );
}

/** A compact recessed input inside a form row: tee name, rating and slope; stroke index; yardages. Coral when wrong. */
function CellInput({ style, invalid, ...input }: ComponentProps<typeof TextInput> & { invalid?: boolean }) {
  const { c, t, space } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textTertiary}
      {...input}
      style={[{ minHeight: 40, paddingHorizontal: space[2], borderRadius: 8, backgroundColor: c.surfaceRaised2, color: invalid ? c.destructive : c.textPrimary, fontSize: t.rowBody.fontSize, borderWidth: invalid ? 1.5 : 0, borderColor: c.destructive }, style]}
    />
  );
}

/** Validation copy. Announced by VoiceOver as it appears; the coral field is the visual cue. */
function Problem({ children }: { children: string }) {
  return (
    <Text step="footnote" tone="negative" accessibilityRole="alert" accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}
