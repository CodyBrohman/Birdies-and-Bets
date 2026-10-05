import { DEFAULT_PREFERENCES, usePreferences } from '@/store';
import { maybeAskForReview } from './rating';

jest.mock('expo-store-review', () => ({ hasAction: jest.fn(() => Promise.resolve(true)), requestReview: jest.fn(() => Promise.resolve()) }));
const StoreReview = jest.requireMock('expo-store-review') as { hasAction: jest.Mock; requestReview: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  usePreferences.setState({ ...DEFAULT_PREFERENCES, reviewPrompted: undefined, hydrated: true });
});

describe('rating prompt', () => {
  it('waits for the third finished round', async () => {
    expect(await maybeAskForReview(1)).toBe(false);
    expect(await maybeAskForReview(2)).toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('asks once at the third round and never again', async () => {
    expect(await maybeAskForReview(3)).toBe(true);
    expect(usePreferences.getState().reviewPrompted).toBe(true);
    expect(await maybeAskForReview(4)).toBe(false);
    expect(await maybeAskForReview(13)).toBe(false);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('does nothing (and keeps trying later) where the store cannot ask', async () => {
    StoreReview.hasAction.mockResolvedValueOnce(false);
    expect(await maybeAskForReview(3)).toBe(false);
    expect(usePreferences.getState().reviewPrompted).toBeUndefined();
    expect(await maybeAskForReview(4)).toBe(true);
  });
});
