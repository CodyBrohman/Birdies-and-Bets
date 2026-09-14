import { color, type, hit } from './tokens';

/** Guards the environmental rules from the design handoff. */
describe('design tokens', () => {
  it('defines every semantic role in both schemes', () => {
    expect(Object.keys(color.light).sort()).toEqual(Object.keys(color.dark).sort());
  });

  it('keeps every type step at or above the 13pt floor', () => {
    for (const [name, step] of Object.entries(type)) {
      if (name === 'tab') continue; // documented exception under a 24pt icon
      expect(step.fontSize).toBeGreaterThanOrEqual(13);
    }
  });

  it('requires tabular figures on numeric steps', () => {
    expect(type.score.tabular).toBe(true);
    expect(type.cell.tabular).toBe(true);
    expect(type.total.tabular).toBe(true);
  });

  it('meets the touch-target minimums', () => {
    expect(hit.min).toBeGreaterThanOrEqual(44);
    expect(hit.scoreEntry).toBeGreaterThanOrEqual(56);
    expect(hit.primaryButton).toBeGreaterThanOrEqual(60);
  });
});
