import { color, font, type, hit, type ColorScheme } from './tokens';

/** WCAG relative luminance and contrast ratio for #RRGGBB values. */
function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
}
function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Every text-on-surface pairing the kit produces, with the ratio it must meet (4.5 text, 3 non-text / large). */
const PAIRS: { fg: keyof ColorScheme; bg: keyof ColorScheme; min: number }[] = [
  { fg: 'textPrimary', bg: 'surface', min: 4.5 },
  { fg: 'textPrimary', bg: 'surfaceRaised', min: 4.5 },
  { fg: 'textPrimary', bg: 'surfaceRaised2', min: 4.5 },
  { fg: 'textSecondary', bg: 'surface', min: 4.5 },
  { fg: 'textSecondary', bg: 'surfaceRaised', min: 4.5 },
  { fg: 'textTertiary', bg: 'surface', min: 4.5 },
  { fg: 'textTertiary', bg: 'surfaceRaised', min: 4.5 },
  { fg: 'accentText', bg: 'surface', min: 4.5 },
  { fg: 'accentText', bg: 'surfaceRaised', min: 4.5 },
  { fg: 'goldText', bg: 'surface', min: 4.5 },
  { fg: 'goldText', bg: 'surfaceRaised', min: 4.5 },
  { fg: 'negative', bg: 'surface', min: 4.5 },
  { fg: 'negative', bg: 'surfaceRaised', min: 4.5 },
  { fg: 'onAccent', bg: 'accent', min: 4.5 },
  { fg: 'onAccent', bg: 'accentSoft', min: 4.5 },
  { fg: 'accentTintText', bg: 'accentTint', min: 4.5 },
  { fg: 'goldTintText', bg: 'goldTint', min: 4.5 },
  { fg: 'onInverse', bg: 'inverse', min: 4.5 },
  { fg: 'neutralChipText', bg: 'neutralChip', min: 4.5 },
  { fg: 'textPrimary', bg: 'currentHole', min: 4.5 },
  // Non-text: markers, borders that carry state, avatar initials (large bold).
  { fg: 'accent', bg: 'surface', min: 3 },
  { fg: 'gold', bg: 'surface', min: 3 },
  { fg: 'negative', bg: 'surface', min: 3 },
  { fg: 'avatarText', bg: 'avatarA', min: 3 },
  { fg: 'avatarText', bg: 'avatarB', min: 3 },
  { fg: 'avatarText', bg: 'avatarC', min: 3 },
  { fg: 'avatarText', bg: 'avatarD', min: 3 },
  { fg: 'onHero', bg: 'hero', min: 4.5 },
  { fg: 'onHero', bg: 'heroRaised', min: 4.5 },
  { fg: 'textPrimary', bg: 'goldFill', min: 4.5 },
  { fg: 'textPrimary', bg: 'accentTint', min: 4.5 },
  { fg: 'accentText', bg: 'accentTint', min: 4.5 },
  { fg: 'textSecondary', bg: 'accentTint', min: 4.5 },
  // Decorative borders only need to be visible.
  { fg: 'accentBorder', bg: 'surface', min: 1.3 },
  { fg: 'goldBorder', bg: 'surface', min: 1.3 },
];

describe('design tokens', () => {
  it('defines every semantic role in both schemes', () => {
    expect(Object.keys(color.light).sort()).toEqual(Object.keys(color.dark).sort());
    for (const role of ['inverse', 'onInverse', 'textTertiary', 'dividerSoft', 'positiveText', 'accentTintText', 'gold', 'goldTint', 'surfaceRaised2', 'tickUpcoming', 'avatarA', 'avatarD']) {
      expect(color.light).toHaveProperty(role);
    }
  });

  it('every colour is a hex or rgba string', () => {
    for (const scheme of [color.light, color.dark]) {
      for (const v of Object.values(scheme)) expect(v).toMatch(/^(#[0-9A-Fa-f]{6}|rgba?\()/);
    }
  });

  it.each(['light', 'dark'] as const)('%s scheme meets contrast on every pairing the kit produces', (scheme) => {
    const c = color[scheme];
    const failures = PAIRS.filter((p) => contrast(c[p.fg], c[p.bg]) < p.min).map((p) => `${p.fg} on ${p.bg}: ${contrast(c[p.fg], c[p.bg]).toFixed(2)} < ${p.min}`);
    expect(failures).toEqual([]);
  });

  it('is light only: the dark scheme is an alias of the light one', () => {
    expect(color.dark).toBe(color.light);
  });

  it('uses Inter for every type step', () => {
    for (const step of ['overline', 'eyebrow', 'displayXl', 'display', 'headline', 'score', 'total', 'cell', 'caption', 'body', 'bodyStrong', 'label', 'title', 'button', 'tab'] as const) expect(type[step].fontFamily).toMatch(/^Inter_/);
  });

  it('keeps every type step at or above the 11pt floor and body at 1.4 line height', () => {
    for (const step of Object.values(type)) expect(step.fontSize).toBeGreaterThanOrEqual(11);
    expect(type.body.lineHeight / type.body.fontSize).toBeGreaterThanOrEqual(1.4);
  });

  it('requires tabular figures on numeric steps', () => {
    expect(type.score.tabular).toBe(true);
    expect(type.cell.tabular).toBe(true);
    expect(type.total.tabular).toBe(true);
    expect(type.caption.tabular).toBe(true);
  });

  it('meets the touch-target minimums', () => {
    expect(hit.min).toBeGreaterThanOrEqual(44);
    expect(hit.iconButton).toBeGreaterThanOrEqual(44);
    expect(hit.scoreEntry).toBeGreaterThanOrEqual(56);
    expect(hit.primaryButton).toBeGreaterThanOrEqual(56);
  });
});
