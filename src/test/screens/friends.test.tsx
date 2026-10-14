import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import Friends from '@/app/(tabs)/(friends)/friends/index';
import FriendPage from '@/app/(tabs)/(friends)/friends/[id]';
import AddFriend from '@/app/friend/add';
import Group from '@/app/group/[id]';
import { useProfileStore, useRoundStore } from '@/store';
import type { PlayerProfile } from '@/types';
import { lastActionSheet, lastAlert, pressAction, pressAlert, renderScreens, resetStores, seedPrefs } from '../screen';

const Empty = () => null;
const routes = { friends: Friends, 'friends/[id]': FriendPage, 'friend/add': AddFriend, 'group/[id]': Group, play: Empty, 'history/[id]': Empty };
const profile = (id: string, name: string, handicapIndex?: number): PlayerProfile => ({ id, name, handicapIndex, indexHistory: handicapIndex != null ? [{ at: '2026-09-01T00:00:00.000Z', index: handicapIndex + 1 }, { at: '2026-10-01T00:00:00.000Z', index: handicapIndex }] : [], createdAt: '2026-09-01T00:00:00.000Z' });

beforeEach(async () => {
  await resetStores();
});

const seedFriends = () => {
  useProfileStore.setState({ profiles: [profile('pr_me', 'Alex Morgan', 14.2), profile('pr_maya', 'Maya Chen', 11.2), profile('pr_sam', 'Sam Rivera')], groups: [{ id: 'g1', name: 'Saturday group', memberIds: ['pr_me', 'pr_maya', 'pr_sam'] }] });
  seedPrefs({ meProfileId: 'pr_me' });
};

describe('Friends', () => {
  it('with nobody saved, says where friends come from and offers to add one', () => {
    const r = renderScreens(routes, '/friends');
    expect(screen.getByText('No friends yet')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add friend' }));
    expect(r.getPathname()).toBe('/friend/add');
  });

  it('lists groups and friends; a group plays in one tap', async () => {
    seedFriends();
    const r = renderScreens(routes, '/friends');
    expect(screen.getByRole('button', { name: /^Maya Chen, HCP 11\.2/ })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /^Saturday group, Alex Morgan, Maya Chen, Sam Rivera/ }));
    await waitFor(() => expect(lastActionSheet()?.options).toEqual(['Play with this group', 'Edit group', 'Delete group', 'Cancel']));
    await pressAction('Play with this group');
    await waitFor(() => expect(useRoundStore.getState().draft.players.map((p) => p.name)).toEqual(['Alex Morgan', 'Maya Chen', 'Sam Rivera']));
    expect(r.getPathname()).toBe('/play');
  });

  it('adds a friend with a handicap index', () => {
    const r = renderScreens(routes, '/friend/add');
    fireEvent.changeText(screen.getByLabelText("Friend's name"), 'Dana Fox');
    fireEvent.changeText(screen.getByLabelText("Friend's handicap index"), '+1.5');
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(useProfileStore.getState().profiles.map((p) => [p.name, p.handicapIndex])).toEqual([['Dana Fox', -1.5]]);
    expect(r.getPathname()).toBe('/friends');
  });

  it('a new group needs a name and two players', () => {
    seedFriends();
    renderScreens(routes, '/group/new');
    const save = () => screen.getByRole('button', { name: 'Save' });
    expect(save().props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.changeText(screen.getByLabelText('Group name'), 'Twilight');
    fireEvent.press(screen.getByRole('button', { name: 'Maya Chen' }));
    fireEvent.press(save());
    expect(useProfileStore.getState().groups.map((g) => [g.name, g.memberIds])).toContainEqual(['Twilight', ['pr_me', 'pr_maya']]);
  });
});

describe('A friend', () => {
  it('shows the index history, and Play with adds them to New round', () => {
    seedFriends();
    const r = renderScreens(routes, '/friends/pr_maya');
    expect(screen.getByRole('header', { name: 'Index history' })).toBeTruthy();
    expect(screen.getByText('Down 1.0')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Play with Maya' }));
    expect(useRoundStore.getState().draft.players.map((p) => p.name)).toEqual(['Maya Chen']);
    expect(r.getPathname()).toBe('/play');
  });

  it('deleting a friend asks first; your own page has no delete', async () => {
    seedFriends();
    const first = renderScreens(routes, '/friends/pr_sam');
    fireEvent.press(screen.getByRole('button', { name: 'Delete player' }));
    await waitFor(() => expect(lastAlert()?.title).toBe('Delete Sam Rivera?'));
    pressAlert('Delete player');
    await waitFor(() => expect(useProfileStore.getState().profiles.some((p) => p.id === 'pr_sam')).toBe(false));
    first.unmount();
    renderScreens(routes, '/friends/pr_me');
    expect(screen.queryByRole('button', { name: 'Delete player' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Play with/ })).toBeNull();
  });
});
