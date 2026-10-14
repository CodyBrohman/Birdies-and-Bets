import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import PlayScreen from '@/app/round/play';
import RoundLayout from '@/app/round/_layout';
import { getGame } from '@/games/registry';
import { newActiveGame, useProfileStore, useRoundStore } from '@/store';
import { cody, lastActionSheet, lastAlert, marcus, pressAction, pressAlert, renderScreens, resetStores, seedPrefs, seedRound } from '../screen';

const Empty = () => null;
const routes = { 'round/_layout': RoundLayout, 'round/play': PlayScreen, 'round/summary': Empty, 'round/standings': Empty, 'round/note': Empty, 'round/card': Empty, 'new-round/games': Empty, index: Empty };

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

  it('the player menu marks a pick-up, clears a score, and Undo puts it back', async () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const marcus = players[1]!;
    fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${marcus.name}.*Options$`) }));
    await waitFor(() => expect(lastActionSheet()?.options).toEqual(['Picked up', 'Cancel']));
    pressAction('Picked up');
    await waitFor(() => expect(scoreOn(1, marcus.id)).toBeNull());
    expect(screen.getByText(`${marcus.name} picked up on hole 1`)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${marcus.name}.*Options$`) }));
    await waitFor(() => expect(lastActionSheet()?.options).toEqual(['Picked up', 'Clear score', 'Cancel']));
    pressAction('Clear score');
    await waitFor(() => expect(scoreOn(1, marcus.id)).toBeUndefined());
    fireEvent.press(screen.getByRole('button', { name: `Undo: Cleared ${marcus.name} on hole 1` }));
    expect(scoreOn(1, marcus.id)).toBeNull();
  });

  it('Everyone par fills only the players without a score', () => {
    const { players } = seedRound();
    renderScreens(routes, '/round/play');
    const [cody, marcus] = [players[0]!, players[1]!];
    fireEvent.press(screen.getByLabelText(`${cody.name} one more`));
    fireEvent.press(screen.getByRole('button', { name: `Par ${parOf(1)} for ${marcus.name}` }));
    expect(scoreOn(1, cody.id)).toBe(parOf(1) + 1);
    expect(scoreOn(1, marcus.id)).toBe(parOf(1));
    expect(screen.queryByRole('button', { name: /^Everyone par|^Par d+ for/ })).toBeNull();
  });

  it('End round from the menu can discard the round, after a coral confirm', async () => {
    seedRound({ scores: { 1: { cody: 4, marcus: 5 } } });
    const r = renderScreens(routes, '/round/play');
    fireEvent.press(screen.getByRole('button', { name: 'Round options' }));
    await waitFor(() => expect(lastActionSheet()?.options).toEqual(['Add hole note', 'Add a game', 'End round', 'Cancel']));
    pressAction('End round');
    await waitFor(() => expect(lastAlert()?.title).toBe('End this round?'));
    pressAlert('Discard round');
    await waitFor(() => expect(lastAlert()?.title).toBe('Discard this round?'));
    pressAlert('Discard round');
    await waitFor(() => expect(useRoundStore.getState().round).toBeNull());
    await waitFor(() => expect(r.getPathname()).toBe('/'));
  });

  it('the menu opens the hole note', async () => {
    seedRound();
    const r = renderScreens(routes, '/round/play');
    fireEvent.press(screen.getByRole('button', { name: 'Round options' }));
    await waitFor(() => expect(lastActionSheet()).toBeDefined());
    pressAction('Add hole note');
    await waitFor(() => expect(r.getPathname()).toBe('/round/note'));
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
    const first = renderScreens(routes, '/round/play');
    expect(screen.queryByText('you')).toBeNull();
    first.unmount();

    useProfileStore.setState({ profiles: [{ id: 'pr_cody', name: 'Cody', indexHistory: [], createdAt: '2026-10-01T00:00:00.000Z' }] });
    seedPrefs({ meProfileId: 'pr_cody' });
    seedRound({ players: [{ ...cody, profileId: 'pr_cody' }, marcus] });
    renderScreens(routes, '/round/play');
    expect(screen.getByText('you')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cody, you. Options' })).toBeTruthy();
  });

  it('shows the games link only when the round has games', () => {
    seedRound();
    renderScreens(routes, '/round/play');
    expect(screen.queryByLabelText(/^Standings./)).toBeNull();
  });

  it('the games link opens the standings', () => {
    seedRound({ games: [newActiveGame(getGame('skins')!)] });
    const r = renderScreens(routes, '/round/play');
    fireEvent.press(screen.getByLabelText(/^Standings. Skins: /));
    expect(r.getPathname()).toBe('/round/standings');
  });
});
