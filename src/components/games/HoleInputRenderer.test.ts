import { missingInputs, visibleInputs } from './HoleInputRenderer';
import type { HoleInputSpec } from '@/types';

const wolfSpecs: HoleInputSpec[] = [
  { key: 'mode', label: 'The wolf went', type: 'choice', options: ['Alone', 'With a partner'] },
  { key: 'partner', label: 'Partner', type: 'player', showIf: { key: 'mode', equals: 'With a partner' } },
  { key: 'served', label: 'Served', type: 'confirm' },
];

describe('hole input visibility', () => {
  it('hides conditional prompts until their condition is met', () => {
    expect(visibleInputs(wolfSpecs, {}).map((s) => s.key)).toEqual(['mode', 'served']);
    expect(visibleInputs(wolfSpecs, { mode: 'Alone' }).map((s) => s.key)).toEqual(['mode', 'served']);
    expect(visibleInputs(wolfSpecs, { mode: 'With a partner' }).map((s) => s.key)).toEqual(['mode', 'partner', 'served']);
  });

  it('confirm prompts never block; required ones do', () => {
    expect(missingInputs(wolfSpecs, {}).map((s) => s.key)).toEqual(['mode']);
    expect(missingInputs(wolfSpecs, { mode: 'Alone' })).toEqual([]);
    expect(missingInputs(wolfSpecs, { mode: 'With a partner' }).map((s) => s.key)).toEqual(['partner']);
    expect(missingInputs(wolfSpecs, { mode: 'With a partner', partner: 'Dan' })).toEqual([]);
  });
});
