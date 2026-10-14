// Birdies & Bets: design tokens. Source of truth for the theme layer.
// 2026-10-14: the iOS system font (SF Pro) everywhere, on the iOS text-style ramp; cream ground, white grouped cells,
// forest ink, pine for actions and under par, gold for over par, coral for destructive and errors. Light only.
// Every component reads from here (via useTheme). No hard-coded hex elsewhere.
// Reference: design-system/birdies-and-bets/MASTER.md

export const base = {
  // Cream ground, warm white cells, deep forest ink.
  cream: '#F5F4EC',
  card: '#FFFEFA',
  recess: '#ECEEE5',
  chip: '#E8EBE2',
  hair: '#E6E6DC',
  hair2: '#D9DBCF',
  forest: '#17372D',
  /** Secondary text: clearly lighter than ink, and still about 6.8:1 on cream so it reads in sunlight. */
  forestSoft: '#4F5751',
  /** Tertiary text: the lightest text allowed (about 4.8:1 on cream). */
  forestFaint: '#666E66',
  // The green family: buttons and selected controls, pressed, and the soft green tint.
  pine: '#245C45',
  pineDeep: '#1D4D3A',
  pineTint: '#DCE8D6',
  pineTintText: '#1F4F3B',
  pineBorder: '#B9CDB6',
  // Gold: over-par markers and highlights (fill), deeper gold for markers and text.
  gold: '#E7BD5A',
  goldMarker: '#A87A12',
  goldText: '#8A6514',
  goldTint: '#F5E7C4',
  goldTintText: '#6F5210',
  goldBorder: '#E2CF9C',
  star: '#A8662B',
  /** Coral: destructive actions and errors only. */
  coral: '#B3412B',
  coralTint: '#F8E3DE',
  coralBorder: '#DAAEA3',
  chipText: '#3E4A43',
  /** Off-state control track (a Switch that is off): darker than the hairlines so it reads as a control. */
  tick: '#B7BCAE',
  // Avatars outside a round: one quiet tint (colour means a seat in a round, nothing else).
  sage: '#DCE8D6',
  sand: '#F0DDB3',
  slate: '#DCE1EA',
  rose: '#EFD9D6',
  white: '#FFFFFF',
} as const;

export interface ColorScheme {
  surface: string;
  surfaceRaised: string;
  /** Recessed areas inside a cell (stepper well, stat tiles). */
  surfaceRaised2: string;
  /** Web hover tint over a surface or card. */
  hover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  divider: string;
  dividerSoft: string;
  /** The pine fill (buttons, selected controls, markers). White on it. */
  accent: string;
  /** Pressed fill. */
  accentSoft: string;
  /** Green as text on the surface (links). */
  accentText: string;
  accentTint: string;
  accentTintText: string;
  onAccent: string;
  /** Gold: over-par markers, "gross". */
  gold: string;
  goldText: string;
  goldTint: string;
  goldTintText: string;
  /** Gold badge fill with forest text. */
  goldFill: string;
  /** Aliases of the green family so call sites keep their meaning (good / under par / points up). */
  positive: string;
  positiveText: string;
  positiveTint: string;
  /** Coral: errors. */
  negative: string;
  negativeTint: string;
  /** Coral for destructive actions (Delete account, Delete round): never a green button. */
  destructive: string;
  accentBorder: string;
  goldBorder: string;
  negativeBorder: string;
  /** Selected controls: pine fill, white label. */
  inverse: string;
  onInverse: string;
  neutralChip: string;
  neutralChipText: string;
  /** Off-state track of a switch, and upcoming ticks. */
  tickUpcoming: string;
  currentHole: string;
  scrim: string;
  /** The one dark surface: the round-in-progress card. */
  hero: string;
  /** Buttons sitting on the dark card. */
  heroRaised: string;
  onHero: string;
  onHeroSoft: string;
  /** Rating star. */
  star: string;
  avatarA: string;
  avatarB: string;
  avatarC: string;
  avatarD: string;
  avatarText: string;
}

const light: ColorScheme = {
  surface: base.cream,
  surfaceRaised: base.card,
  surfaceRaised2: base.recess,
  hover: 'rgba(23,55,45,0.04)',
  textPrimary: base.forest,
  textSecondary: base.forestSoft,
  textTertiary: base.forestFaint,
  divider: base.hair,
  dividerSoft: base.hair2,
  accent: base.pine,
  accentSoft: base.pineDeep,
  accentText: base.pine,
  accentTint: base.pineTint,
  accentTintText: base.pineTintText,
  onAccent: base.white,
  gold: base.goldMarker,
  goldText: base.goldText,
  goldTint: base.goldTint,
  goldTintText: base.goldTintText,
  goldFill: base.gold,
  positive: base.pine,
  positiveText: base.pine,
  positiveTint: base.pineTint,
  negative: base.coral,
  negativeTint: base.coralTint,
  destructive: base.coral,
  accentBorder: base.pineBorder,
  goldBorder: base.goldBorder,
  negativeBorder: base.coralBorder,
  inverse: base.pine,
  onInverse: base.white,
  neutralChip: base.chip,
  neutralChipText: base.chipText,
  tickUpcoming: base.tick,
  currentHole: base.pineTint,
  scrim: 'rgba(23,55,45,0.45)',
  hero: base.forest,
  heroRaised: base.pine,
  onHero: base.white,
  onHeroSoft: 'rgba(255,255,255,0.78)',
  star: base.star,
  avatarA: base.sage,
  avatarB: base.sand,
  avatarC: base.slate,
  avatarD: base.rose,
  avatarText: base.forest,
};

/** Light only. `dark` is an alias so scheme-keyed code keeps compiling; dark mode is a post-launch item. */
export const color: { light: ColorScheme; dark: ColorScheme } = { light, dark: light };

/**
 * A player's colour within a round, by seat (first player, second…): the same in the scorecard column, standings and
 * the share image, so a glance tells who is who. Never pine or gold, which mean under and over par.
 */
export interface SeatColor {
  /** Solid: dots, column marks. */
  fill: string;
  /** Avatar background. */
  tint: string;
  /** Initials and text on the tint. */
  onTint: string;
}

export const seatColors: readonly SeatColor[] = [
  { fill: '#3E5C7A', tint: '#DCE4EE', onTint: '#2C4560' }, // slate blue
  { fill: '#7A4A72', tint: '#EEDFEA', onTint: '#5C3355' }, // plum
  { fill: '#1F6A73', tint: '#D6EAEB', onTint: '#164F56' }, // teal
  { fill: '#8A4A2E', tint: '#F1E0D6', onTint: '#6A3520' }, // clay
] as const;

/** System font weights (SF Pro has every one). Text weight comes from the step; overrides use these. */
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;

export type FontWeight = (typeof weight)[keyof typeof weight];

export interface TypeStep {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  /** Tabular lining figures are mandatory on this step (scores, grids, totals). */
  tabular: boolean;
  letterSpacing?: number;
  uppercase?: boolean;
  /** Largest Dynamic Type multiplier this step accepts. Numbers-heavy steps stop earlier so grids still fit. */
  maxScale: number;
}

// Sizes in pt. Two groups while screens are rebuilt:
// - The iOS ramp (2026-10-14), used by rebuilt screens: largeTitle … caption2, plus numerals and table headers.
// - Legacy steps (the 2026-10-01 sizes on the system font), kept until every screen has moved over, then removed.
export const type = {
  // iOS text styles.
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: weight.bold, tabular: false, maxScale: 1.4 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: weight.bold, tabular: false, maxScale: 1.5 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: weight.bold, tabular: false, maxScale: 1.6 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: weight.semibold, tabular: false, maxScale: 1.6 },
  /** iOS "headline": row titles, player names. */
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: weight.semibold, tabular: false, maxScale: 2 },
  /** iOS "body". */
  rowBody: { fontSize: 17, lineHeight: 22, fontWeight: weight.regular, tabular: false, maxScale: 2 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: weight.regular, tabular: false, maxScale: 2 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: weight.regular, tabular: false, maxScale: 2 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: weight.regular, tabular: false, maxScale: 2 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: weight.regular, tabular: false, maxScale: 2 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: weight.regular, tabular: false, maxScale: 2 },
  /** Scorecard table headers (HOLE · PAR · SI · OUT · IN · TOT): the only uppercase text. */
  tableHeader: { fontSize: 12, lineHeight: 16, fontWeight: weight.semibold, tabular: false, letterSpacing: 0.5, uppercase: true, maxScale: 1.4 },
  /** The score being entered. */
  scoreXL: { fontSize: 34, lineHeight: 40, fontWeight: weight.semibold, tabular: true, maxScale: 1.3 },
  /** Big stat numbers. */
  scoreLg: { fontSize: 28, lineHeight: 34, fontWeight: weight.semibold, tabular: true, maxScale: 1.4 },
  scoreMd: { fontSize: 22, lineHeight: 28, fontWeight: weight.semibold, tabular: true, maxScale: 1.4 },
  /** Scorecard cells. */
  cellMd: { fontSize: 17, lineHeight: 22, fontWeight: weight.medium, tabular: true, maxScale: 1.4 },

  // Legacy (2026-10-01 sizes). Removed once no screen uses them.
  displayXl: { fontSize: 40, lineHeight: 44, fontWeight: weight.heavy, tabular: false, maxScale: 1.4 },
  display: { fontSize: 32, lineHeight: 38, fontWeight: weight.bold, tabular: false, maxScale: 1.4 },
  headline: { fontSize: 21, lineHeight: 26, fontWeight: weight.bold, tabular: false, maxScale: 1.6 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: weight.semibold, tabular: false, maxScale: 1.6 },
  button: { fontSize: 17, lineHeight: 22, fontWeight: weight.semibold, tabular: false, maxScale: 1.6 },
  score: { fontSize: 26, lineHeight: 30, fontWeight: weight.semibold, tabular: true, maxScale: 1.4 },
  total: { fontSize: 18, lineHeight: 22, fontWeight: weight.semibold, tabular: true, maxScale: 1.6 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: weight.regular, tabular: false, maxScale: 2 },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: weight.semibold, tabular: false, maxScale: 2 },
  cell: { fontSize: 16, lineHeight: 21, fontWeight: weight.semibold, tabular: true, maxScale: 1.6 },
  label: { fontSize: 14, lineHeight: 19, fontWeight: weight.semibold, tabular: false, maxScale: 2 },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: weight.medium, tabular: true, maxScale: 2 },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: weight.semibold, tabular: false, letterSpacing: 0.6, uppercase: true, maxScale: 2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: weight.semibold, tabular: false, letterSpacing: 0.6, uppercase: true, maxScale: 2 },
  tab: { fontSize: 11, lineHeight: 14, fontWeight: weight.medium, tabular: false, maxScale: 1.6 },
} as const satisfies Record<string, TypeStep>;

export type TypeStepName = keyof typeof type;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;

/** Layout rhythm: 20 screen gutter, 16 cell padding, 14 between cards, 28 before a new section. */
export const layout = { cardPad: 16, stack: 14, section: 28 } as const;

export const radius = {
  xs: 4, // progress ticks
  sm: 6, // small squares
  md: 10, // bogey marker, mini grid cells
  lg: 14, // inner tiles, note bar
  chip: 14, // score chips, time chips
  xl: 20, // cards
  hero: 22, // the round-in-progress card
  sheet: 24, // sheet top corners
  pill: 999, // pills, badges
} as const;

export const hit = {
  min: 48,
  iconButton: 48,
  chip: 48,
  scoreEntry: 62,
  scoreEntryHeight: 76,
  primaryButton: 56,
  secondaryButton: 48,
  /** Filter pills: 40pt visual with hitSlop to 48. */
  pill: 40,
  /** Icon glyph sizes: inline beside text, and inside buttons. */
  iconSm: 20,
  iconMd: 24,
} as const;

/** Screen gutter: 20 on phones, 32 from tablet width. */
export const gutter = { phone: 20, wide: 32, wideFrom: 600 } as const;

export interface ElevationSet {
  /** CSS-style box shadow, supported natively on iOS (new architecture) and on web. */
  raised: { boxShadow: string };
  /** A pressed/hovered card lifts slightly. */
  lifted: { boxShadow: string };
  sheet: { boxShadow: string };
  /** Cards carry a 1pt warm hairline (the cards are outlined, barely shadowed). */
  cardBorder: boolean;
}

const lightElevation: ElevationSet = {
  raised: { boxShadow: '0 1px 2px rgba(23,55,45,0.04)' },
  lifted: { boxShadow: '0 4px 14px rgba(23,55,45,0.08)' },
  sheet: { boxShadow: '0 -8px 32px rgba(23,55,45,0.18)' },
  cardBorder: true,
};

export const elevation: { light: ElevationSet; dark: ElevationSet } = { light: lightElevation, dark: lightElevation };

export const motion = {
  /** The score number's tick when it changes. */
  scoreTick: 120, // ms
  /** Moving to the next hole: content cross-fade. */
  holeChange: 150, // ms
  sheet: 280, // ms, translate/fade
  toggle: 180, // ms
  press: 100, // ms, opacity change on press; never a transform
  state: 150, // ms, web transition for background, shadow and opacity on hover/press
} as const;

/** The one pressed-state opacity, everywhere. */
export const PRESSED_OPACITY = 0.6;
