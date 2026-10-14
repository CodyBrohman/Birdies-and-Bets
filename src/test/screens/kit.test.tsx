// The 2026-10-14 kit, checked the way VoiceOver and a thumb meet it.
import { StyleSheet, type ViewStyle } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Avatar, Button, Icon, ListItem, ListSection, SegmentedControl, Switch } from '@/components/ui';
import { color, seatColors } from '@/theme';
import { lastActionSheet, pressAction, resetStores } from '../screen';

beforeEach(resetStores);

describe('Icon', () => {
  it('is hidden from VoiceOver unless it carries meaning on its own', () => {
    render(
      <>
        <Icon name="trophy" />
        <Icon name="share" accessibilityLabel="Share scorecard" />
      </>,
    );
    expect(screen.getByLabelText('Share scorecard')).toBeTruthy();
    expect(screen.queryAllByRole('image')).toHaveLength(1);
  });
});

describe('ListSection and ListItem', () => {
  it('reads as a header and buttons, with title, subtitle and value in the label', () => {
    const onPress = jest.fn();
    render(
      <ListSection header="Course">
        <ListItem title="Course" value="Sample course" onPress={onPress} />
        <ListItem title="Holes" subtitle="Front 9" accessory="check" onPress={onPress} />
      </ListSection>,
    );
    expect(screen.getByRole('header', { name: 'Course' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Course, Sample course' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Holes, Front 9' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('a long press opens the native action sheet; VoiceOver gets the same actions', () => {
    const edit = jest.fn();
    const del = jest.fn();
    render(
      <ListSection>
        <ListItem title="Cedar Ridge" strong onPress={() => undefined} menu={[{ label: 'Edit', onPress: edit }, { label: 'Delete', onPress: del, destructive: true }]} />
      </ListSection>,
    );
    const row = screen.getByRole('button', { name: 'Cedar Ridge' });
    fireEvent(row, 'longPress');
    expect(lastActionSheet()).toEqual({ title: 'Cedar Ridge', options: ['Edit', 'Delete', 'Cancel'] });
    pressAction('Delete');
    return Promise.resolve().then(() => {
      expect(del).toHaveBeenCalledTimes(1);
      expect(row.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(['Edit', 'Delete']);
      fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'Edit' } });
      expect(edit).toHaveBeenCalledTimes(1);
    });
  });

  it('a destructive row is coral, and a switch row is its own control', () => {
    const onChange = jest.fn();
    render(
      <ListSection>
        <ListItem title="Haptics" accessory={{ switch: true, onChange }} />
        <ListItem title="Delete account" destructive onPress={() => undefined} />
      </ListSection>,
    );
    fireEvent(screen.getByLabelText('Haptics'), 'valueChange', false);
    expect(onChange).toHaveBeenCalledWith(false);
    const del = screen.getByText('Delete account');
    expect(del.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: color.light.destructive })]));
  });
});

describe('Button', () => {
  it('is coral when destructive, on any variant, and says when it is busy', () => {
    render(
      <>
        <Button label="Delete round" destructive onPress={() => undefined} />
        <Button label="Sign out" variant="plain" destructive onPress={() => undefined} />
        <Button label="Save round" loading onPress={() => undefined} />
      </>,
    );
    const flat = (label: string) => StyleSheet.flatten(screen.getByRole('button', { name: label }).props.style);
    expect(flat('Delete round').backgroundColor).toBe(color.light.destructive);
    expect(screen.getByText('Sign out').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: color.light.destructive })]));
    expect(screen.getByRole('button', { name: 'Save round' }).props.accessibilityState).toMatchObject({ busy: true });
    expect(flat('Delete round').minHeight).toBeGreaterThanOrEqual(50);
  });
});

describe('Avatar', () => {
  it('takes the seat colour in a round and one quiet tint elsewhere', () => {
    const { toJSON } = render(
      <>
        <Avatar name="Marcus Lee" seat={1} />
        <Avatar name="Marcus Lee" />
      </>,
    );
    const [inRound, outside] = toJSON() as unknown as { props: { style: unknown } }[];
    expect(StyleSheet.flatten(inRound!.props.style as ViewStyle).backgroundColor).toBe(seatColors[1]!.tint);
    expect(StyleSheet.flatten(outside!.props.style as ViewStyle).backgroundColor).toBe(color.light.accentTint);
    // Decorative: the name always sits beside it, so VoiceOver skips the initials.
    expect(screen.queryAllByText('ML')).toHaveLength(0);
    expect(screen.getAllByText('ML', { includeHiddenElements: true })).toHaveLength(2);
  });
});

describe('native controls', () => {
  it('Switch reports changes', () => {
    const onChange = jest.fn();
    render(<Switch value={false} onChange={onChange} accessibilityLabel="Crash reports" />);
    fireEvent(screen.getByLabelText('Crash reports'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('SegmentedControl reports the chosen value, not the index', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        accessibilityLabel="Scoring basis"
        options={[
          { value: 'gross', label: 'Gross' },
          { value: 'net', label: 'Net' },
        ]}
        value="gross"
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByRole('tab', { name: 'Net' }));
    expect(onChange).toHaveBeenCalledWith('net');
  });
});
