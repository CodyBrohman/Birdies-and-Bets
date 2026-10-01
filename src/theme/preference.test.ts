import { isThemePreference, nextPreference, resolveScheme, useThemePreference } from './preference';

describe('theme preference', () => {
  it('follows the system until a preference is set', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', 'unspecified')).toBe('light');
  });

  it('an explicit preference wins over the system', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('the moon button flips what is showing', () => {
    expect(nextPreference('system', 'light')).toBe('dark');
    expect(nextPreference('system', 'dark')).toBe('light');
    expect(nextPreference('dark', 'dark')).toBe('light');
    expect(nextPreference('light', 'light')).toBe('dark');
  });

  it('validates saved values', () => {
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('blue')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it('defaults the store to system', () => {
    expect(useThemePreference.getState().preference).toBe('system');
    useThemePreference.getState().setPreference('dark');
    expect(useThemePreference.getState().preference).toBe('dark');
    useThemePreference.getState().setPreference('system');
  });
});
