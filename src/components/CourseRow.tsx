import { ListItem, type ListAccessory, type ListMenuItem } from '@/components/ui';
import type { Course } from '@/types';
import { courseSummary } from '@/lib/courseInfo';

export interface CourseRowProps {
  course: Course;
  /** Right-hand fact: your best here, or when you last played it. */
  value?: string;
  onPress?: () => void;
  accessory?: ListAccessory;
  selected?: boolean;
  menu?: ListMenuItem[];
  testID?: string;
  /** Set by ListSection. */
  first?: boolean;
}

/** A course identified by its data: the name, then "Pebble Beach, CA · Par 72 · 4 tees". No photos. */
export function CourseRow({ course, value, onPress, accessory, selected, menu, testID, first }: CourseRowProps) {
  return (
    <ListItem
      title={course.name}
      strong
      subtitle={courseSummary(course)}
      value={value}
      onPress={onPress}
      accessory={accessory}
      selected={selected}
      menu={menu}
      menuTitle={course.name}
      testID={testID}
      first={first}
    />
  );
}
