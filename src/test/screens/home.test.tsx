import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import Home from '@/app/(tabs)/(home)/index';
import { useHistoryStore, usePreferences, useProfileStore, useRoundStore } from '@/store';
import { computeAllHandicaps, holesInPlay } from '@/lib/handicap';
import { netSettlements } from '@/lib/settlement';
import { summarizeRound } from '@/lib/history';
import { cedarRidge, cody, lastAlert, marcus, pressAlert, renderScreens, resetStores, seedPrefs, seedRound } from '../screen';

const Empty = () => null;
const routes = { index: Home, 'round/play': Empty, play: Empty, history: Empty, 'history/[id]': Empty, onboarding: Empty };

beforeEach(resetStores);

/** Play a full round (Cody 4s, Marcus 5s), file it in history with a summary as Results would, and clear it. */
function finishRound(completedAt: string) {
  const scores: Record<number, Record<string, number>> = {};
  for (let h = 1; h <= 18; h++) scores[h] = { cody: 4, marcus: 5 };
  const round = { ...seedRound({ players: [{ ...cody, profileId: 'pr_cody' }, marcus], scores }), status: 'complete' as const };
  const holes = holesInPlay(cedarRidge, 18);
  const handicaps = computeAllHandicaps(round.players, cedarRidge, round.settings);
  const summary = summarizeRound({ round, holes, handicaps, standings: [], gameNames: [], netted: netSettlements([], ['cody', 'marcus']), completedAt });
  useHistoryStore.setState((s) => ({ entries: [{ summary, round }, ...s.entries] }));
  useRoundStore.getState().discardRound();
}

describe('Home', () => {
  it('with nothing going on, offers New round and says rounds will show up here', () => {
    const r = renderScreens(routes, '/');
    expect(screen.getByText('No rounds yet')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'New round' }));
    expect(r.getPathname()).toBe('/play');
  });

  it('with a round in progress, shows it on the dark card and resumes it', () => {
    seedRound({ scores: { 1: { cody: 4, marcus: 5 }, 2: { cody: 3, marcus: 4 } }, currentHole: 3 });
    const r = renderScreens(routes, '/');
    expect(screen.getByLabelText(/^Round in progress · Cedar Ridge Golf Club · hole 3 · Cody [−+E\d]+ thru 2$/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New round' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Resume round' }));
    expect(r.getPathname()).toBe('/round/play');
  });

  it('a round being set up shows as the next round', () => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    useRoundStore.getState().setDraftPlayers([cody, marcus]);
    useRoundStore.getState().setDraftSettings({ teeTime: '2099-05-02T08:30' });
    const r = renderScreens(routes, '/');
    expect(screen.getByRole('header', { name: 'Next round' })).toBeTruthy();
    expect(screen.getByText(/^Saturday, 8:30 AM · 2 players$/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('next-round'));
    expect(r.getPathname()).toBe('/play');
  });

  it('shows this year in numbers and the recent rounds, yours featured', () => {
    useProfileStore.setState({ profiles: [{ id: 'pr_cody', name: 'Cody', indexHistory: [], createdAt: '2026-01-01T00:00:00.000Z' }] });
    seedPrefs({ meProfileId: 'pr_cody' });
    finishRound(new Date().toISOString());
    finishRound(new Date().toISOString());
    const r = renderScreens(routes, '/');
    expect(screen.getByLabelText('Rounds, 2')).toBeTruthy();
    expect(screen.getByLabelText('Best, 72')).toBeTruthy();
    expect(screen.getAllByText('Cedar Ridge Golf Club')).toHaveLength(2);
    fireEvent.press(screen.getByRole('button', { name: 'See all' }));
    expect(r.getPathname()).toBe('/history');
  });

  it('asks about anonymous usage once when analytics is set up, and remembers the answer', async () => {
    process.env.EXPO_PUBLIC_APTABASE_KEY = 'A-US-0000000000';
    try {
      seedPrefs({ analytics: undefined });
      renderScreens(routes, '/');
      await waitFor(() => expect(lastAlert()?.title).toBe('Share anonymous usage?'));
      pressAlert('No thanks');
      await waitFor(() => expect(usePreferences.getState().analytics).toBe(false));
    } finally {
      delete process.env.EXPO_PUBLIC_APTABASE_KEY;
    }
  });

  it('does not ask about usage when analytics is not set up, or once answered', () => {
    seedPrefs({ analytics: undefined });
    renderScreens(routes, '/');
    expect(lastAlert()).toBeUndefined();
  });
});
