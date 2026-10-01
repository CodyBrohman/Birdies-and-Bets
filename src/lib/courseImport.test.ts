import { mapProviderCourse, validateCourse, type ProviderCourseDto } from './courseImport';
import { cedarRidge } from './__fixtures__/cedarRidge';

const dto: ProviderCourseDto = {
  id: '123',
  name: '  Pebble Beach Golf Links ',
  location: 'Pebble Beach, CA',
  tees: [
    { id: 'blue', name: 'Blue', rating: 74.9, slope: 144, color: '#3B5F8A' },
    { id: 'white', name: 'White', rating: 72.1, slope: 135 },
  ],
  holes: Array.from({ length: 18 }, (_, i) => ({ number: 18 - i, par: i % 4 === 0 ? 5 : i % 4 === 1 ? 3 : 4, strokeIndex: 18 - i, yardage: { blue: 400 + i, white: 380 + i } })),
};

describe('validateCourse', () => {
  it('accepts the bundled course', () => {
    expect(validateCourse(cedarRidge)).toEqual([]);
  });
  it('lists every problem', () => {
    const bad = { name: ' ', holes: [{ number: 1, par: 2, strokeIndex: 1 }, { number: 3, par: 4, strokeIndex: 1 }], teeBoxes: [] };
    const problems = validateCourse(bad);
    expect(problems).toEqual(expect.arrayContaining(['Course has no name', 'Course has 2 holes; expected 9 or 18', 'Holes are not numbered 1 to n', 'Hole 1 has par 2', 'Course has no tees']));
    expect(problems.some((p) => p.includes('Stroke indexes'))).toBe(true);
  });
});

describe('mapProviderCourse', () => {
  it('maps, sorts holes, sums yardages and tags the source', () => {
    const c = mapProviderCourse(dto, 'golfcourseapi', '2026-09-22T00:00:00Z');
    expect(c.id).toBe('api_golfcourseapi_123');
    expect(c.name).toBe('Pebble Beach Golf Links');
    expect(c.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(c.teeBoxes[0]).toMatchObject({ id: 'blue', name: 'Blue', rating: 74.9, slope: 144, color: '#3B5F8A' });
    expect(c.teeBoxes[0]!.totalYards).toBe(dto.holes.reduce((s, h) => s + h.yardage!.blue!, 0));
    expect(c).toMatchObject({ userEntered: true, source: 'api', provider: 'golfcourseapi', providerId: '123', importedAt: '2026-09-22T00:00:00Z', location: 'Pebble Beach, CA' });
  });
  it('throws with the problems when the data cannot be scored', () => {
    expect(() => mapProviderCourse({ ...dto, holes: dto.holes.slice(0, 5) }, 'x')).toThrow(/expected 9 or 18/);
  });
});
