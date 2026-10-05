import { cardDataFrom, cardPayloadFromUrl, cardUrl, decodeCard, encodeCard, toCardView, type CardSource } from './cardLink';
import { computeAllHandicaps, holesInPlay } from './handicap';
import { totals } from './scoring';
import { cedarRidge, foursome, throughSix } from './__fixtures__/cedarRidge';
import type { Round } from '../types/round';

function source(over: Partial<Round['settings']> = {}, results = throughSix): CardSource {
  const settings = { holeCount: 18 as const, allowance: 100, stakeLabel: 'points', ...over };
  const holes = holesInPlay(cedarRidge, settings.holeCount, settings.nine);
  const round: Round = {
    id: 'r1',
    createdAt: '2026-10-05T14:00:00.000Z',
    updatedAt: '2026-10-05T18:00:00.000Z',
    status: 'complete',
    course: cedarRidge,
    teeBoxId: 'blue',
    players: foursome,
    games: [],
    settings,
    holeResults: results,
    currentHole: 7,
  };
  return {
    round,
    holes,
    handicaps: computeAllHandicaps(foursome, cedarRidge, settings),
    games: [{ name: 'Skins', basis: 'net', headline: 'Cody leads with 2 skins', lines: ['Cody 2 skins', 'Priya 1 skin'] }],
    basis: 'net',
    completedAt: round.updatedAt,
  };
}

describe('card links', () => {
  it('round-trips a card, keeping names, scores, pick-ups and unplayed holes apart', () => {
    const src = source({}, [...throughSix, { holeNumber: 7, scores: { cody: null, marcus: 5 } }]);
    const data = cardDataFrom(src);
    const back = decodeCard(encodeCard(data));
    expect(back).toEqual(data);
    const cody = back!.p.find((p) => p[0] === 'Cody')!;
    expect(cody[2][6]).toBeNull(); // picked up on 7
    expect(cody[2][7]).toBe(-1); // never played 8
  });

  it('rebuilds a round the scorecard can draw, with the same gross and net totals', () => {
    const src = source();
    const view = toCardView(decodeCard(encodeCard(cardDataFrom(src)))!);
    expect(view.round.course.name).toBe('Cedar Ridge Golf Club');
    for (const [i, p] of foursome.entries()) {
      for (const basis of ['gross', 'net'] as const) {
        const before = totals(src.round.holeResults, src.holes, p.id, basis, src.handicaps[p.id]);
        const after = totals(view.round.holeResults, view.holes, `p${i}`, basis, view.handicaps[`p${i}`]);
        expect(after.strokes).toBe(before.strokes);
      }
    }
  });

  it('handles a back-nine round', () => {
    const src = source({ holeCount: 9, nine: 'back' }, [{ holeNumber: 10, scores: { cody: 4, marcus: 5, priya: 6, dan: 3 } }]);
    const view = toCardView(decodeCard(encodeCard(cardDataFrom(src)))!);
    expect(view.holes.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(view.round.settings).toMatchObject({ holeCount: 9, nine: 'back' });
  });

  it('keeps names with accents and emoji intact', () => {
    const src = source();
    src.round = { ...src.round, players: [{ ...foursome[0]!, name: 'José 🏌️' }, ...foursome.slice(1)] };
    expect(decodeCard(encodeCard(cardDataFrom(src)))!.p[0]![0]).toBe('José 🏌️');
  });

  it('puts the data after # on the website card page', () => {
    expect(cardUrl(cardDataFrom(source()))).toMatch(/^https:\/\/www\.birdiesandbets\.com\/card#v1\.[A-Za-z0-9_-]+$/);
  });

  it('a full foursome over 18 holes fits comfortably', () => {
    const results = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, scores: { cody: 4, marcus: 5, priya: 6, dan: 3 } }));
    expect(encodeCard(cardDataFrom(source({}, results))).length).toBeLessThan(2000);
  });

  it('rejects anything that is not a valid v1 card', () => {
    const good = encodeCard(cardDataFrom(source()));
    expect(decodeCard(undefined)).toBeNull();
    expect(decodeCard('')).toBeNull();
    expect(decodeCard('v2.' + good.slice(3))).toBeNull();
    expect(decodeCard('v1.not*base64')).toBeNull();
    expect(decodeCard(good.slice(0, 40))).toBeNull();
    expect(decodeCard('v1.' + 'A'.repeat(5000))).toBeNull();
    const bad = (o: object) => decodeCard(encodeCard(o as never));
    const data = cardDataFrom(source());
    expect(bad({ ...data, h: [] })).toBeNull();
    expect(bad({ ...data, p: [['Cody', 0, [4]]] })).toBeNull(); // score count does not match holes
    expect(bad({ ...data, b: 'stableford' })).toBeNull();
    expect(bad({ ...data, c: 'x'.repeat(500) })).toBeNull();
  });

  it('finds the payload in every form of card link, and nothing else', () => {
    for (const url of ['https://www.birdiesandbets.com/card#v1.abc', 'https://birdiesandbets.com/card/#v1.abc', 'birdiesandbets://card#v1.abc', '/card#v1.abc']) expect(cardPayloadFromUrl(url)).toBe('v1.abc');
    for (const url of ['https://www.birdiesandbets.com/card', 'https://www.birdiesandbets.com/privacy#top', 'https://evil.example/card#v1.abc', 'birdiesandbets://round/play', '/card#']) expect(cardPayloadFromUrl(url)).toBeNull();
  });
});
