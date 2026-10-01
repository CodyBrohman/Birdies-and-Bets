import { checkStrokeIndexes, parWarning, strokeIndexesInHoleOrder, uniqueCourseName, validateTee, yardageProblem, yardageTotals } from './courseEditor';

describe('validateTee', () => {
  it('accepts a blank rating and slope, or a plausible pair', () => {
    expect(validateTee({ name: 'White', rating: '', slope: '' })).toEqual({});
    expect(validateTee({ name: 'White', rating: '71.4', slope: '128' })).toEqual({});
  });
  it('flags a missing name, silly numbers and a lone rating or slope', () => {
    expect(validateTee({ name: ' ', rating: '', slope: '' }).name).toBeDefined();
    expect(validateTee({ name: 'W', rating: '171', slope: '128' }).rating).toMatch(/55–85/);
    expect(validateTee({ name: 'W', rating: '71', slope: '12.5' }).slope).toMatch(/whole number/);
    expect(validateTee({ name: 'W', rating: 'abc', slope: '120' }).rating).toBeDefined();
    expect(validateTee({ name: 'W', rating: '71', slope: '' }).slope).toBe('Add the slope too');
    expect(validateTee({ name: 'W', rating: '', slope: '120' }).rating).toBe('Add the rating too');
  });
});

describe('checkStrokeIndexes', () => {
  it('passes a complete set', () => {
    const r = checkStrokeIndexes(strokeIndexesInHoleOrder(9), 9);
    expect(r.badHoles.size).toBe(0);
    expect(r.missing).toEqual([]);
    expect(r.message).toBeNull();
  });
  it('flags every hole sharing a duplicate and names the unused values', () => {
    const r = checkStrokeIndexes(['1', '2', '2', '4', '5', '6', '7', '8', '9'], 9);
    expect([...r.badHoles]).toEqual([1, 2]);
    expect(r.missing).toEqual([3]);
    expect(r.message).toBe('SI 2 on holes 2 and 3. Unused: 3');
  });
  it('flags blanks and out-of-range values', () => {
    const r = checkStrokeIndexes(['', '20', '3', '4', '5', '6', '7', '8', '9'], 9);
    expect([...r.badHoles]).toEqual([0, 1]);
    expect(r.message).toBe('Stroke index must be 1–9 on every hole. Unused: 1, 2');
  });
});

describe('yardage', () => {
  it('validates one hole and totals a tee only when complete', () => {
    expect(yardageProblem('')).toBeNull();
    expect(yardageProblem('420')).toBeNull();
    expect(yardageProblem('12')).toMatch(/50–700/);
    expect(yardageProblem('4.5')).toMatch(/50–700/);
    const holes: { yards: Record<string, string> }[] = [{ yards: { w: '400', b: '420' } }, { yards: { w: '150' } }];
    expect(yardageTotals(holes, ['w', 'b'])).toEqual({ w: 550, b: undefined });
    expect(yardageTotals([{ yards: { w: '10' } }], ['w'])).toEqual({ w: undefined });
  });
});

describe('parWarning', () => {
  it('warns only on implausible totals', () => {
    expect(parWarning(Array(18).fill(4))).toBeNull();
    expect(parWarning(Array(18).fill(3))).toMatch(/Par 54/);
    expect(parWarning(Array(9).fill(6))).toMatch(/Par 54/);
    expect(parWarning(Array(9).fill(4))).toBeNull();
  });
});

describe('uniqueCourseName', () => {
  it('appends (copy) and counts up past taken names, ignoring an existing suffix', () => {
    const existing = [{ name: 'Cedar' }, { name: 'Cedar (copy)' }, { name: 'cedar (COPY 2)' }];
    expect(uniqueCourseName('Cedar', existing)).toBe('Cedar (copy 3)');
    expect(uniqueCourseName('Cedar (copy)', existing)).toBe('Cedar (copy 3)');
    expect(uniqueCourseName('Pine', existing)).toBe('Pine (copy)');
  });
});
