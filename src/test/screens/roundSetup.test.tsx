// The sheets that set up a round: course, players, the game catalog, a game's settings, round options, and the
// games of the round in progress.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import ChooseCourse from '@/app/new-round/course';
import Players from '@/app/new-round/players';
import AddGame from '@/app/new-round/add-game';
import GameSettings from '@/app/new-round/game/[gameId]';
import Options from '@/app/new-round/options';
import Games from '@/app/new-round/games';
import { getGame } from '@/games/registry';
import { newActiveGame, useProfileStore, useRoundStore } from '@/store';
import { SAMPLE_COURSE } from '@/data/courses';
import { cedarRidge, cody, lastAlert, marcus, pressAlert, renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = {
  play: Empty,
  'round/play': Empty,
  'new-round/course': ChooseCourse,
  'new-round/players': Players,
  'new-round/add-game': AddGame,
  'new-round/game/[gameId]': GameSettings,
  'new-round/options': Options,
  'new-round/games': Games,
  'new-round/add-course': Empty,
  courses: Empty,
};
const draft = () => useRoundStore.getState().draft;
const profile = (id: string, name: string, handicapIndex?: number) => ({ id, name, handicapIndex, indexHistory: [], createdAt: '2026-10-01T00:00:00.000Z' });

beforeEach(resetStores);

describe('Course sheet', () => {
  it('lists saved courses, filters as you type, and choosing one sets the course and its tees', () => {
    renderScreens(routes, '/new-round/course');
    fireEvent.changeText(screen.getByLabelText('Search your courses'), 'zzz');
    expect(screen.getByText('No saved course matches “zzz”.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Search your courses'), 'sample');
    fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${SAMPLE_COURSE.name}`) }));
    expect(draft().course?.id).toBe(SAMPLE_COURSE.id);
    expect(draft().teeBoxId).toBe(SAMPLE_COURSE.teeBoxes[0]!.id);
  });
});

describe('Players sheet', () => {
  it('adds and takes out friends, and stops at four', () => {
    useProfileStore.setState({ profiles: ['a', 'b', 'c', 'd', 'e'].map((x) => profile(`pr_${x}`, `Player ${x.toUpperCase()}`, 10)) });
    renderScreens(routes, '/new-round/players');
    for (const x of ['A', 'B', 'C', 'D']) fireEvent.press(screen.getByRole('button', { name: `Player ${x}` }));
    expect(draft().players.map((p) => p.name)).toEqual(['Player A', 'Player B', 'Player C', 'Player D']);
    expect(screen.getByText('4 of 4 in the round')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Player E' }));
    expect(screen.getByText('Four is a full group. Take someone out first.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Player A, in the round' }));
    expect(draft().players).toHaveLength(3);
  });

  it('someone new is saved as a friend and joins the round', () => {
    renderScreens(routes, '/new-round/players');
    fireEvent.changeText(screen.getByLabelText("New player's name"), 'Dana Fox');
    fireEvent.changeText(screen.getByLabelText("New player's handicap index"), '12.4');
    fireEvent.press(screen.getByRole('button', { name: 'Add player' }));
    expect(useProfileStore.getState().profiles.map((p) => [p.name, p.handicapIndex])).toEqual([['Dana Fox', 12.4]]);
    expect(draft().players.map((p) => p.name)).toEqual(['Dana Fox']);
  });

  it('a group fills the round in one tap', () => {
    useProfileStore.setState({ profiles: [profile('pr_a', 'Ann'), profile('pr_b', 'Bo')], groups: [{ id: 'g1', name: 'Saturday group', memberIds: ['pr_a', 'pr_b'] }] });
    const r = renderScreens(routes, '/new-round/players');
    fireEvent.press(screen.getByRole('button', { name: 'Saturday group, Ann · Bo' }));
    expect(draft().players.map((p) => p.name)).toEqual(['Ann', 'Bo']);
    expect(r.getPathname()).toBe('/play');
  });
});

describe('Game catalog and settings', () => {
  beforeEach(() => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    useRoundStore.getState().setDraftPlayers([cody, marcus, { ...marcus, id: 'priya', name: 'Priya' }]);
  });

  it('adds a game that needs nothing more and closes', () => {
    const r = renderScreens(routes, '/new-round/add-game');
    expect(screen.getByRole('header', { name: 'Points games' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Just for fun' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /^Skins, / }));
    expect(draft().games.map((g) => g.gameId)).toEqual(['skins']);
    expect(r.getPathname()).toBe('/play');
  });

  it('a game that needs players picked opens its settings', () => {
    const r = renderScreens(routes, '/new-round/add-game');
    fireEvent.press(screen.getByRole('button', { name: /^Match Play, / }));
    expect(r.getPathname()).toBe('/new-round/game/match-play');
  });

  it('settings change the stake, the players, net or gross, and can remove the game', async () => {
    useRoundStore.getState().setDraftGames([{ ...newActiveGame(getGame('match-play')!), playerIds: ['cody'] }]);
    const r = renderScreens(routes, '/new-round/game/match-play');
    expect(screen.getByRole('header', { name: 'Players · pick 2' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Priya' }));
    expect(draft().games[0]!.playerIds).toEqual(['cody', 'priya']);
    fireEvent.press(screen.getByRole('tab', { name: 'Gross' }));
    expect(draft().games[0]!.basis).toBe('gross');
    fireEvent.press(screen.getByRole('button', { name: 'Remove Match Play' }));
    await waitFor(() => expect(draft().games).toEqual([]));
    expect(r.getPathname()).toBe('/play');
  });

  it('a number setting steps, and a boolean one switches', () => {
    useRoundStore.getState().setDraftGames([newActiveGame(getGame('skins')!)]);
    renderScreens(routes, '/new-round/game/skins');
    fireEvent.press(screen.getByRole('button', { name: 'Stake up' }));
    expect(draft().games[0]!.config.stake).toBe(6);
    fireEvent(screen.getByLabelText('Carryover'), 'valueChange', false);
    expect(draft().games[0]!.config.carryover).toBe(false);
  });
});

describe('Round options', () => {
  it('sets the allowance (95% included) and what the points are called, with no $ preset', () => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    renderScreens(routes, '/new-round/options');
    fireEvent.press(screen.getByRole('button', { name: '95%' }));
    expect(draft().settings.allowance).toBe(95);
    expect(screen.queryByRole('tab', { name: '$' })).toBeNull();
    fireEvent.press(screen.getByRole('tab', { name: 'Something else' }));
    fireEvent.changeText(screen.getByLabelText('What the points are called'), 'beers');
    expect(draft().settings.stakeLabel).toBe('beers');
    fireEvent.press(screen.getByRole('button', { name: 'Start on hole 10' }));
    expect(draft().settings.startHole).toBe(10);
  });
});

describe('Games of the round in progress', () => {
  it('lists the games with their settings and an Add a game row', () => {
    seedRound({ games: [newActiveGame(getGame('skins')!)], scores: { 1: { cody: 4, marcus: 5 } } });
    renderScreens(routes, '/new-round/games?target=round');
    expect(screen.getByRole('button', { name: 'Skins, 5 pts per skin · Net' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add a game' })).toBeTruthy();
  });

  it('removing a game from the round in progress asks first', async () => {
    seedRound({ games: [newActiveGame(getGame('skins')!)] });
    renderScreens(routes, '/new-round/game/skins?target=round');
    fireEvent.press(screen.getByRole('button', { name: 'Remove Skins' }));
    await waitFor(() => expect(lastAlert()?.title).toBe('Remove Skins?'));
    pressAlert('Remove Skins');
    await waitFor(() => expect(useRoundStore.getState().round?.games).toEqual([]));
  });
});
