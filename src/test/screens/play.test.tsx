import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import PlayScreen from '@/app/round/play';
import { getGame } from '@/games/registry';
import { newActiveGame, useRoundStore } from '@/store';
import { lastAlert, pressAlert, renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = { 'round/play': PlayScreen, 'round/summary': Empty, 'round/standings': Empty, index: Empty };

const round = () => useRoundStore.getState().round!;
const scoreOn = (hole: number, playerId: string) => round().holeResults.find((r) => r.holeNumber === hole)?.scores[playerId];
const parOf = (hole: number) => round().course.holes.find((h) => h.number === hole)!.par;

beforeEach(resetStores);

describe('Scorecard', () => {
  it('from no score: + is a bogey, − a birdie, and tapping the number enters par', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const [cody, marcus] = [players[0]!, players[1]!];
    fireEvent.press(screen.getByLabelText(`${cody.name} one more`));
    expect(scoreOn(1, cody.id)).toBe(parOf(1) + 1);
    fireEvent.press(screen.getByLabelText(`${cody.name} one more`));
    expect(scoreOn(1, cody.id)).toBe(parOf(1) + 2);
    fireEvent.press(screen.getByLabelText(`${marcus.name} one fewer`));
    expect(scoreOn(1, marcus.id)).toBe(parOf(1) - 1);
    fireEvent.press(screen.getByLabelText(`${marcus.name}: par ${parOf(1)}`));
    expect(scoreOn(1, marcus.id)).toBe(parOf(1));
  });

  it('− never goes below 1', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const cody = players[0]!;
    for (let i = 0; i < 10; i++) fireEvent.press(screen.getByLabelText(`${cody.name} one fewer`));
    expect(scoreOn(1, cody.id)).toBe(1);
  });

  it('Pick up records no score for that player', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const marcus = players[1]!;
    fireEvent.press(screen.getByLabelText(`${marcus.name}: pick up, no score`));
    expect(scoreOn(1, marcus.id)).toBeNull();
  });

  it('Next hole moves on; a hole chip jumps straight to that hole', async () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    fireEvent.press(screen.getByLabelText(`${players[0]!.name} one more`));
    fireEvent.press(screen.getByRole('button', { name: 'Next hole' }));
    await waitFor(() => expect(round().currentHole).toBe(2));
    expect(scoreOn(1, players[0]!.id)).toBe(parOf(1) + 1);
    // The strip chip comes first; the nine card column carries the same label and jumps too.
    fireEvent.press(screen.getAllByLabelText(/^Hole 7, par/)[0]!);
    expect(round().currentHole).toBe(7);
  });

  it('on the last hole the button finishes the round', async () => {
    const all: Record<number, Record<string, number>> = {};
    for (let h = 1; h <= 18; h++) all[h] = { cody: 4, marcus: 5 };
    seedRound({ currentHole: 18, scores: all });
    const r = renderScreens(routes, '/round/play');
    expect(screen.queryByRole('button', { name: 'Next hole' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Finish round' }));
    await waitFor(() => expect(r.getPathname()).toBe('/round/summary'));
    expect(lastAlert()).toBeUndefined();
  });

  it('finishing with holes missing scores asks first', async () => {
    seedRound({ currentHole: 18, scores: { 1: { cody: 4, marcus: 5 } } });
    const r = renderScreens(routes, '/round/play');
    fireEvent.press(screen.getByRole('button', { name: 'Finish round' }));
    await waitFor(() => expect(lastAlert()?.title).toBe('17 holes have missing scores'));
    pressAlert('Keep scoring');
    expect(r.getPathname()).toBe('/round/play');
    fireEvent.press(screen.getByRole('button', { name: 'Finish round' }));
    pressAlert('Finish round');
    await waitFor(() => expect(r.getPathname()).toBe('/round/summary'));
  });

  it('says "you" only when the phone owner is playing', () => {
    seedRound();
    renderScreens(routes, '/round/play');
    expect(screen.queryByText(/\(you\)/)).toBeNull();
    expect(screen.queryByText('Your score')).toBeNull();
  });

  it('shows the games link only when the round has games', () => {
    seedRound();
    renderScreens(routes, '/round/play');
    expect(screen.queryByLabelText(/^Game standings/)).toBeNull();
  });

  it('the games link opens the standings', () => {
    seedRound({ games: [newActiveGame(getGame('skins')!)] });
    const r = renderScreens(routes, '/round/play');
    fireEvent.press(screen.getByLabelText('Game standings, 1 game'));
    expect(r.getPathname()).toBe('/round/standings');
  });
});
