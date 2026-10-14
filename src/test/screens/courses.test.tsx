import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import Courses from '@/app/(tabs)/(courses)/courses/index';
import CoursePage from '@/app/(tabs)/(courses)/courses/[id]';
import AddCourse from '@/app/new-round/add-course';
import { SAMPLE_COURSE } from '@/data/courses';
import { courseSummary } from '@/lib/courseInfo';
import { useCourseStore, useRoundStore } from '@/store';
import { lastActionSheet, pressAction, renderScreens, resetStores } from '../screen';

const Empty = () => null;
const routes = { courses: Courses, 'courses/[id]': CoursePage, 'new-round/add-course': AddCourse, play: Empty };

beforeEach(async () => {
  await resetStores();
  useCourseStore.setState({ userCourses: [], recentIds: [] });
});

describe('Courses', () => {
  it('lists courses by their data and filters as you type', () => {
    renderScreens(routes, '/courses');
    expect(screen.getByRole('button', { name: /^Sample course, Par 72 · 3 tees/ })).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Search courses'), 'zzz');
    expect(screen.getByText('No saved course matches “zzz”.')).toBeTruthy();
  });

  it('a long press offers Play this course, which sets up the round', async () => {
    const r = renderScreens(routes, '/courses');
    fireEvent(screen.getByRole('button', { name: /^Sample course/ }), 'longPress');
    expect(lastActionSheet()?.options).toEqual(['Play this course', 'Duplicate and edit', 'Cancel']);
    await pressAction('Play this course');
    expect(useRoundStore.getState().draft.course?.id).toBe(SAMPLE_COURSE.id);
    expect(r.getPathname()).toBe('/play');
  });

  it('a course page shows its tees and holes, and Play this course sets up the round', () => {
    const r = renderScreens(routes, `/courses/${SAMPLE_COURSE.id}`);
    // The name is the native title (not rendered here); the page opens with the summary line.
    expect(screen.getByText(courseSummary(SAMPLE_COURSE))).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Sample course' })).toBeNull();
    expect(screen.getByLabelText(/^Hole 1: par \d, stroke index \d+/)).toBeTruthy();
    expect(screen.getByLabelText(/^Out: par \d+/)).toBeTruthy();
    for (const t of SAMPLE_COURSE.teeBoxes) expect(screen.getAllByText(t.name).length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: SAMPLE_COURSE.teeBoxes[1]!.name })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Play this course' }));
    expect(useRoundStore.getState().draft.course?.id).toBe(SAMPLE_COURSE.id);
    expect(r.getPathname()).toBe('/play');
  });

  it('Add course saves a course you can play straight away', async () => {
    const r = renderScreens(routes, '/new-round/add-course');
    expect(screen.getByText('Name the course to continue.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Course name'), 'Rolling Hills');
    fireEvent.press(screen.getByRole('button', { name: 'Save course' }));
    await waitFor(() => expect(useCourseStore.getState().userCourses.map((k) => k.name)).toEqual(['Rolling Hills']));
    expect(useRoundStore.getState().draft.course?.name).toBe('Rolling Hills');
    await waitFor(() => expect(r.getPathname()).toBe('/play'));
  });

  it('Add course will not save a name that is already taken', () => {
    renderScreens(routes, '/new-round/add-course');
    fireEvent.changeText(screen.getByLabelText('Course name'), 'Sample course');
    expect(screen.getAllByText('A course with that name is already saved.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Save course' }).props.accessibilityState).toMatchObject({ disabled: true });
  });
});
