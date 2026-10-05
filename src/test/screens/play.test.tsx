import { fireEvent, screen } from 'expo-router/testing-library';
import PlayScreen from '@/app/round/play';
import { getGame } from '@/games/registry';
import { newActiveGame, useRoundStore } from '@/store';
import { renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = { 'round/play': PlayScreen, 'round/summary': Empty, 'round/standings': Empty, index: Empty };

const round = () => useRoundStore.getState().round!;
const scoreOn = (hole: number, playerId: string) => round().holeResults.find((r) => r.holeNumber === hole)?.scores[playerId];
const parOf = (hole: number) => round().course.holes.find((h) => h.number === hole)!.par;

beforeEach(resetStores);

describe('Scorecard', () => {
  it('first + fills in par, the next adds a stroke', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const cody = players[0]!;
    fireEvent.press(screen.getByLabelText(`${cody.name} one more`));
    expect(scoreOn(1, cody.id)).toBe(parOf(1));
    fireEvent.press(screen.getByLabelText(`${cody.name} one more`));
    expect(scoreOn(1, cody.id)).toBe(parOf(1) + 1);
  });

  it('− also starts at par, then never goes below 1', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const cody = players[0]!;
    const minus = () => fireEvent.press(screen.getByLabelText(`${cody.name} one fewer`));
    minus();
    expect(scoreOn(1, cody.id)).toBe(parOf(1));
    for (let i = 0; i < 10; i++) minus();
    expect(scoreOn(1, cody.id)).toBe(1);
  });

  it('Pick up records no score for that player', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const marcus = players[1]!;
    fireEvent.press(screen.getByLabelText(`${marcus.name}: pick up, no score`));
    expect(scoreOn(1, marcus.id)).toBeNull();
  });

  it('Next hole moves on; a hole chip jumps straight to that hole', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    fireEvent.press(screen.getByLabelText(`${players[0]!.name} one more`));
    fireEvent.press(screen.getByRole('button', { name: 'Next hole' }));
    expect(round().currentHole).toBe(2);
    expect(scoreOn(1, players[0]!.id)).toBe(parOf(1));
    // The strip chip comes first; the nine card column carries the same label and jumps too.
    fireEvent.press(screen.getAllByLabelText(/^Hole 7, par/)[0]!);
    expect(round().currentHole).toBe(7);
  });

  it('on the last hole the button finishes the round', () => {
    seedRound({ currentHole: 18 });
    const r = renderScreens(routes, '/round/play');
    expect(screen.queryByRole('button', { name: 'Next hole' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Finish round' }));
    expect(r.getPathname()).toBe('/round/summary');
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
