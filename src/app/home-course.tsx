import { useRouter } from 'expo-router';
import { ListItem, ListSection, SheetScreen } from '@/components/ui';
import { CourseRow } from '@/components/CourseRow';
import { useCourseStore, usePreferences } from '@/store';

/** Your home course, picked from saved courses. It comes first whenever you choose a course for a round. */
export default function HomeCourseSheet() {
  const router = useRouter();
  const homeCourseId = usePreferences((s) => s.homeCourseId);
  const update = usePreferences((s) => s.update);
  useCourseStore((s) => s.userCourses);
  const courses = useCourseStore((s) => s.allCourses)();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const choose = (id: string | undefined) => {
    update({ homeCourseId: id });
    close();
  };

  return (
    <SheetScreen title="Home course" onClose={close} closeLabel="Cancel">
      <ListSection footer="Saved courses only. Add yours on the Courses tab.">
        <ListItem title="None" accessory={!homeCourseId ? 'check' : 'none'} selected={!homeCourseId} onPress={() => choose(undefined)} />
        {courses.map((k) => (
          <CourseRow key={k.id} course={k} accessory={homeCourseId === k.id ? 'check' : 'none'} selected={homeCourseId === k.id} onPress={() => choose(k.id)} />
        ))}
      </ListSection>
    </SheetScreen>
  );
}
