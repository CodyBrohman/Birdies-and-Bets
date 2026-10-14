import { color, seatColors, type, hit, weight, type ColorScheme } from './tokens';

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
/** An rgba() colour as it actually appears over a solid background. */
function blend(rgba: string, bg: string): string {
  const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(rgba);
  if (!m) return rgba;
  const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const under = [0, 2, 4].map((i) => parseInt(bg.slice(1 + i, 3 + i), 16));
  const mix = [r, g, b].map((v, i) => Math.round(v * a + under[i]! * (1 - a)));
  return '#' + mix.map((v) => v.toString(16).padStart(2, '0')).join('');
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
  // Destructive actions: coral text, and white on a coral button.
  { fg: 'destructive', bg: 'surface', min: 4.5 },
  { fg: 'destructive', bg: 'surfaceRaised', min: 4.5 },
  { fg: 'onAccent', bg: 'destructive', min: 4.5 },
  // Decorative borders only need to be visible; the off switch track must read as a control.
  { fg: 'accentBorder', bg: 'surface', min: 1.3 },
  { fg: 'goldBorder', bg: 'surface', min: 1.3 },
  { fg: 'tickUpcoming', bg: 'surfaceRaised', min: 1.8 },
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

  it('uses the system font: every step has a weight and no font family', () => {
    for (const step of Object.values(type)) {
      expect('fontFamily' in step).toBe(false);
      expect(Object.values(weight)).toContain(step.fontWeight);
    }
  });

  it('secondary and tertiary text are clearly different (two real levels, not one)', () => {
    const c = color.light;
    expect(contrast(c.textSecondary, c.surface) - contrast(c.textTertiary, c.surface)).toBeGreaterThan(1.5);
  });

  it('soft text on the dark round card stays readable once blended', () => {
    const c = color.light;
    expect(contrast(blend(c.onHeroSoft, c.hero), c.hero)).toBeGreaterThanOrEqual(4.5);
  });

  it('seat colours: initials readable on their tint, marks visible on the page, and none of them pine or gold', () => {
    const c = color.light;
    for (const s of seatColors) {
      expect(contrast(s.onTint, s.tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.fill, c.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(s.fill, c.surfaceRaised)).toBeGreaterThanOrEqual(3);
      expect([c.accent, c.gold, c.goldFill, c.negative]).not.toContain(s.fill);
    }
    expect(new Set(seatColors.map((s) => s.fill)).size).toBe(seatColors.length);
  });

  it('keeps every type step at or above the 11pt floor and body at 1.4 line height', () => {
    for (const step of Object.values(type)) expect(step.fontSize).toBeGreaterThanOrEqual(11);
    expect(type.body.lineHeight / type.body.fontSize).toBeGreaterThanOrEqual(1.4);
  });

  it('requires tabular figures on numeric steps', () => {
    for (const step of [type.score, type.cell, type.total, type.caption, type.scoreXL, type.scoreLg, type.scoreMd, type.cellMd]) expect(step.tabular).toBe(true);
  });

  it('keeps uppercase to the scorecard table headers among the new steps', () => {
    const fresh = ['largeTitle', 'title1', 'title2', 'title3', 'rowTitle', 'rowBody', 'callout', 'subhead', 'footnote', 'caption1', 'caption2', 'scoreXL', 'scoreLg', 'scoreMd', 'cellMd'] as const;
    for (const name of fresh) expect((type[name] as { uppercase?: boolean }).uppercase).toBeUndefined();
    expect(type.tableHeader.uppercase).toBe(true);
  });

  it('meets the touch-target minimums', () => {
    expect(hit.min).toBeGreaterThanOrEqual(44);
    expect(hit.iconButton).toBeGreaterThanOrEqual(44);
    expect(hit.scoreEntry).toBeGreaterThanOrEqual(56);
    expect(hit.primaryButton).toBeGreaterThanOrEqual(50);
    expect(hit.secondaryButton).toBeGreaterThanOrEqual(44);
  });
});
