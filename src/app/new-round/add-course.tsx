import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Segmented, Text, TextField } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { useTheme } from '@/theme';
import { useCourseStore, useRoundStore } from '@/store';
import type { Course, Hole, HoleCount } from '@/types';
import { newId } from '@/lib/id';

interface HoleDraft {
  par: 3 | 4 | 5;
  si: string;
}

/**
 * Manual course entry, built to be fast: name, optional rating/slope, then par chips and a
 * stroke-index field per hole. Pars default to 4 and SI to the hole number so most rows need one tap.
 */
export default function AddCourseScreen() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const addUserCourse = useCourseStore((s) => s.addUserCourse);
  const markRecent = useCourseStore((s) => s.markRecent);
  const setDraftCourse = useRoundStore((s) => s.setDraftCourse);
  const setDraftHoleCount = useRoundStore((s) => s.setDraftHoleCount);

  const [name, setName] = useState('');
  const [teeName, setTeeName] = useState('White');
  const [rating, setRating] = useState('');
  const [slope, setSlope] = useState('');
  const [holeCount, setHoleCount] = useState<HoleCount>(18);
  const [holes, setHoles] = useState<HoleDraft[]>(() => Array.from({ length: 18 }, (_, i) => ({ par: 4, si: String(i + 1) })));

  const visibleHoles = holes.slice(0, holeCount);
  const totalPar = visibleHoles.reduce((s, h) => s + h.par, 0);

  const siProblem = useMemo(() => {
    const sis = visibleHoles.map((h) => Number(h.si));
    if (sis.some((n) => !Number.isInteger(n) || n < 1 || n > holeCount)) return `Stroke index must be 1–${holeCount}`;
    if (new Set(sis).size !== sis.length) return 'Each stroke index must be used once';
    return null;
  }, [visibleHoles, holeCount]);

  const canSave = name.trim().length > 0 && !siProblem;

  const setHole = (i: number, patch: Partial<HoleDraft>) => setHoles((hs) => hs.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  const save = async () => {
    if (!canSave) return;
    const ratingNum = rating.trim() ? Number(rating) : undefined;
    const slopeNum = slope.trim() ? Number(slope) : undefined;
    const teeId = 'tee';
    const course: Course = {
      id: newId('course'),
      name: name.trim(),
      userEntered: true,
      teeBoxes: [
        {
          id: teeId,
          name: teeName.trim() || 'Tees',
          rating: ratingNum != null && Number.isFinite(ratingNum) ? ratingNum : undefined,
          slope: slopeNum != null && Number.isFinite(slopeNum) ? slopeNum : undefined,
        },
      ],
      holes: visibleHoles.map<Hole>((h, i) => ({ number: i + 1, par: h.par, strokeIndex: Number(h.si) })),
    };
    await addUserCourse(course);
    void markRecent(course.id);
    setDraftHoleCount(holeCount);
    setDraftCourse(course, teeId);
    router.push('/new-round/players');
  };

  return (
    <Screen noBottomInset>
      <SetupHeader title="Add course" meta={`Par ${totalPar}`} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: space[4], paddingBottom: space[4] }} keyboardShouldPersistTaps="handled">
          <TextField placeholder="Course name" value={name} onChangeText={setName} accessibilityLabel="Course name" autoCapitalize="words" />

          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <TextField style={{ flex: 1 }} placeholder="Tee" value={teeName} onChangeText={setTeeName} accessibilityLabel="Tee name" />
            <TextField style={{ width: 90 }} placeholder="Rating" value={rating} onChangeText={setRating} keyboardType="decimal-pad" accessibilityLabel="Course rating" />
            <TextField style={{ width: 80 }} placeholder="Slope" value={slope} onChangeText={setSlope} keyboardType="number-pad" accessibilityLabel="Slope rating" />
          </View>
          <Text step="caption" tone="secondary" tabular={false}>
            Rating and slope are optional. Without them everyone plays gross.
          </Text>

          <Segmented
            options={[
              { value: '18', label: '18 holes' },
              { value: '9', label: '9 holes' },
            ]}
            value={String(holeCount)}
            onChange={(v) => setHoleCount(v === '9' ? 9 : 18)}
            accessibilityLabel="Hole count"
          />

          <View style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: c.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], height: 32 }}>
              <Text step="caption" tone="secondary" style={{ width: 44 }}>
                Hole
              </Text>
              <Text step="caption" tone="secondary" style={{ flex: 1 }}>
                Par
              </Text>
              <Text step="caption" tone="secondary" style={{ width: 64 }}>
                SI
              </Text>
            </View>
            {visibleHoles.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], height: 52, borderTopWidth: 1, borderTopColor: c.divider }}>
                <Text step="bodyStrong" tabular style={{ width: 44 }}>
                  {i + 1}
                </Text>
                <View style={{ flex: 1, flexDirection: 'row', gap: space[1] }}>
                  {([3, 4, 5] as const).map((p) => {
                    const on = h.par === p;
                    return (
                      <Pressable
                        key={p}
                        accessibilityRole="button"
                        accessibilityLabel={`Par ${p}`}
                        accessibilityState={{ selected: on }}
                        onPress={() => setHole(i, { par: p })}
                        style={{
                          width: 44,
                          height: 40,
                          borderRadius: radius.md,
                          borderWidth: 1.5,
                          borderColor: on ? c.accent : c.divider,
                          backgroundColor: on ? c.accent : c.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text step="label" style={{ color: on ? c.onAccent : c.textPrimary }}>
                          {p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextField
                  style={{ width: 64, height: 40, textAlign: 'center' }}
                  value={h.si}
                  onChangeText={(v) => setHole(i, { si: v.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  maxLength={2}
                  accessibilityLabel={`Hole ${i + 1} stroke index`}
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>

          {siProblem ? (
            <Text step="label" tone="negative">
              {siProblem}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ paddingVertical: space[3], borderTopWidth: 1, borderTopColor: c.divider }}>
        <Button label="Save and choose players" disabled={!canSave} onPress={() => void save()} />
      </View>
    </Screen>
  );
}
