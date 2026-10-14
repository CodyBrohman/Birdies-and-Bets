import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import Rounds from '@/app/(tabs)/(home,courses,friends)/history/index';
import RoundPage from '@/app/(tabs)/(home,courses,friends)/history/[id]';
import { useHistoryStore, useRoundStore } from '@/store';
import { computeAllHandicaps, holesInPlay } from '@/lib/handicap';
import { netSettlements } from '@/lib/settlement';
import { summarizeRound } from '@/lib/history';
import { cedarRidge, lastActionSheet, lastAlert, pressAction, pressAlert, renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = { index: Empty, play: Empty, history: Rounds, 'history/[id]': RoundPage };

beforeEach(resetStores);

/** File a finished round (Cody 4s, Marcus 5s, with a note on hole 3) in history, as Results would. */
function finishRound(completedAt: string): string {
  const scores: Record<number, Record<string, number>> = {};
  for (let h = 1; h <= 18; h++) scores[h] = { cody: 4, marcus: 5 };
  const seeded = seedRound({ scores });
  useRoundStore.getState().setHoleNote(3, 'Chip-in from the bunker');
  const round = { ...useRoundStore.getState().round!, status: 'complete' as const };
  const holes = holesInPlay(cedarRidge, 18);
  const summary = summarizeRound({ round, holes, handicaps: computeAllHandicaps(round.players, cedarRidge, round.settings), standings: [], gameNames: [], netted: netSettlements([], ['cody', 'marcus']), completedAt });
  useHistoryStore.setState((s) => ({ entries: [{ summary, round }, ...s.entries] }));
  useRoundStore.getState().discardRound();
  return seeded.id;
}

describe('Rounds', () => {
  it('lists every round in month sections', () => {
    finishRound('2026-08-15T18:00:00.000Z');
    finishRound('2026-10-04T18:00:00.000Z');
    renderScreens(routes, '/history');
    expect(screen.getByRole('header', { name: 'October 2026' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'August 2026' })).toBeTruthy();
  });

  it('a long press deletes a round, after a coral confirm', async () => {
    finishRound('2026-10-04T18:00:00.000Z');
    renderScreens(routes, '/history');
    fireEvent(screen.getByRole('button', { name: /^Cedar Ridge Golf Club/ }), 'longPress');
    expect(lastActionSheet()?.options).toEqual(['Delete round', 'Cancel']);
    await pressAction('Delete round');
    await waitFor(() => expect(lastAlert()?.title).toBe('Delete this round?'));
    pressAlert('Delete round');
    await waitFor(() => expect(useHistoryStore.getState().entries).toHaveLength(0));
  });

  it('with none, says so and offers New round', () => {
    const r = renderScreens(routes, '/history');
    expect(screen.getByText('No rounds yet')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'New round' }));
    expect(r.getPathname()).toBe('/play');
  });
});

describe('A round', () => {
  it('shows who won, the scorecard and the notes, and deletes after asking', async () => {
    const id = finishRound('2026-10-04T18:00:00.000Z');
    renderScreens(routes, `/history/${id}`);
    expect(screen.getByRole('header', { name: /^Cody won/ })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Scorecard' })).toBeTruthy();
    expect(screen.getByLabelText('Hole 3: Chip-in from the bunker')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Delete round' }));
    await waitFor(() => expect(lastAlert()?.buttons).toEqual(['Cancel', 'Delete round']));
    pressAlert('Delete round');
    await waitFor(() => expect(useHistoryStore.getState().entries).toHaveLength(0));
  });

  it('a round that is gone says so', () => {
    renderScreens(routes, '/history/nope');
    expect(screen.getByText('That round is no longer saved.')).toBeTruthy();
  });
});
