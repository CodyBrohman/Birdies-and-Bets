// Birdies & Bets — design tokens. Source of truth for the theme layer.
// Design: the 2026-10-01 mockups. Cream ground, warm white hairline cards, deep forest ink, pine buttons and
// selected pills, dark forest hero cards, gold HCP badge. Inter everywhere. Light only. tailwind.config.js mirrors these.
// Every component reads from here (via useTheme). No hard-coded hex elsewhere.
// Reference: design-system/birdies-and-bets/MASTER.md

export const base = {
  // Cream ground, warm white cards, deep forest ink (2026-10-01 mockups).
  cream: '#F5F4EC',
  card: '#FFFEFA',
  recess: '#ECEEE5',
  chip: '#E8EBE2',
  hair: '#E6E6DC',
  hair2: '#D9DBCF',
  forest: '#17372D',
  forestSoft: '#5E665F',
  forestFaint: '#666E66',
  // The green family: buttons and selected pills, pressed, and the soft green tint.
  pine: '#245C45',
  pineDeep: '#1D4D3A',
  pineTint: '#DCE8D6',
  pineTintText: '#1F4F3B',
  pineBorder: '#B9CDB6',
  // Gold: HCP badge and highlights (fill), deeper gold for markers and text.
  gold: '#E7BD5A',
  goldMarker: '#A87A12',
  goldText: '#8A6514',
  goldTint: '#F5E7C4',
  goldTintText: '#6F5210',
  goldBorder: '#E2CF9C',
  star: '#A8662B',
  /** Coral: errors only. */
  coral: '#B3412B',
  coralTint: '#F8E3DE',
  coralBorder: '#DAAEA3',
  chipText: '#3E4A43',
  tick: '#D3D6CB',
  // Avatars: soft tints with forest initials.
  sage: '#DCE8D6',
  sand: '#F0DDB3',
  slate: '#DCE1EA',
  rose: '#EFD9D6',
  white: '#FFFFFF',
} as const;

export interface ColorScheme {
  surface: string;
  surfaceRaised: string;
  /** Recessed areas inside a card (time chips, stepper, stat tiles). */
  surfaceRaised2: string;
  /** Web hover tint over a surface or card. */
  hover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  divider: string;
  dividerSoft: string;
  /** The pine fill (buttons, selected pills, markers). White on it. */
  accent: string;
  /** Pressed fill. */
  accentSoft: string;
  /** Green as text on the surface (eyebrows, links). */
  accentText: string;
  accentTint: string;
  accentTintText: string;
  onAccent: string;
  /** Gold: over-par markers, "gross". */
  gold: string;
  goldText: string;
  goldTint: string;
  goldTintText: string;
  /** Gold badge fill (HCP badge, check on the selected course) with forest text. */
  goldFill: string;
  /** Aliases of the green family so existing call sites keep their meaning (good / under par). */
  positive: string;
  positiveText: string;
  positiveTint: string;
  /** Coral: errors and destructive actions only. Never bogeys. */
  negative: string;
  negativeTint: string;
  accentBorder: string;
  goldBorder: string;
  negativeBorder: string;
  /** Selected pills and chips: pine fill, white label. */
  inverse: string;
  onInverse: string;
  neutralChip: string;
  neutralChipText: string;
  tickUpcoming: string;
  currentHole: string;
  scrim: string;
  /** Dark forest hero cards (round card, profile card, sticky bar). */
  hero: string;
  /** Buttons and icon discs sitting on a hero card. */
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
  onHeroSoft: 'rgba(255,255,255,0.72)',
  star: base.star,
  avatarA: base.sage,
  avatarB: base.sand,
  avatarC: base.slate,
  avatarD: base.rose,
  avatarText: base.forest,
};

/**
 * The app is light only (the mockups have no dark mode). `dark` is an alias so older scheme-keyed code
 * and the ThemeScope API keep compiling; both resolve to the same cream palette.
 */
export const color: { light: ColorScheme; dark: ColorScheme } = { light, dark: light };

// Font family names as registered with expo-font (one entry per weight). Inter for everything on screen.
// The serif and mono faces stay registered for the share card and legacy call sites but are not used in the UI.
export const font = {
  display: 'Inter_800ExtraBold',
  serif: 'PlayfairDisplay_900Black',
  serifItalic: 'PlayfairDisplay_900Black_Italic',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemibold: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export type FontFamily = (typeof font)[keyof typeof font];

export interface TypeStep {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  /** Tabular lining figures are mandatory on this step (scores, grids, totals). */
  tabular: boolean;
  letterSpacing?: number;
  uppercase?: boolean;
  /** Largest Dynamic Type multiplier this step accepts. Numbers-heavy steps stop earlier so grids still fit. */
  maxScale: number;
}

// Sizes in pt, measured from the mockups. Weight is baked into the family name.
export const type = {
  displayXl: { fontFamily: font.display, fontSize: 40, lineHeight: 44, tabular: false, letterSpacing: -1, maxScale: 1.4 }, // "Hole 12"
  display: { fontFamily: font.uiBold, fontSize: 32, lineHeight: 36, tabular: false, letterSpacing: -0.9, maxScale: 1.4 }, // screen titles: "Find your fairway."
  headline: { fontFamily: font.uiBold, fontSize: 21, lineHeight: 26, tabular: false, letterSpacing: -0.3, maxScale: 1.6 }, // section titles: "Bring your crew"
  title: { fontFamily: font.uiBold, fontSize: 16, lineHeight: 21, tabular: false, letterSpacing: -0.1, maxScale: 1.6 }, // card and row titles
  button: { fontFamily: font.uiBold, fontSize: 16, lineHeight: 22, tabular: false, maxScale: 1.6 }, // button labels
  score: { fontFamily: font.uiBold, fontSize: 26, lineHeight: 30, tabular: true, letterSpacing: -0.5, maxScale: 1.4 }, // score chips, "14.2"
  total: { fontFamily: font.uiBold, fontSize: 18, lineHeight: 22, tabular: true, maxScale: 1.6 }, // Out/In rows, results
  body: { fontFamily: font.ui, fontSize: 15, lineHeight: 21, tabular: false, maxScale: 2 }, // subtitles and descriptions
  bodyStrong: { fontFamily: font.uiSemibold, fontSize: 15, lineHeight: 21, tabular: false, maxScale: 2 }, // player names
  cell: { fontFamily: font.uiSemibold, fontSize: 16, lineHeight: 21, tabular: true, maxScale: 1.6 }, // scorecard cell
  label: { fontFamily: font.uiSemibold, fontSize: 14, lineHeight: 19, tabular: false, maxScale: 2 }, // pills, links, small buttons
  caption: { fontFamily: font.uiMedium, fontSize: 13, lineHeight: 17, tabular: true, maxScale: 2 }, // metadata: "Maple, ON"
  /** Uppercase tracked labels: "YOUR NEXT ROUND STARTS HERE", "HANDICAP". */
  eyebrow: { fontFamily: font.uiBold, fontSize: 11, lineHeight: 14, tabular: false, letterSpacing: 1.4, uppercase: true, maxScale: 2 },
  /** Small uppercase badges: "FOR FUN", the live pill. */
  overline: { fontFamily: font.uiBold, fontSize: 11, lineHeight: 14, tabular: false, letterSpacing: 0.8, uppercase: true, maxScale: 2 },
  tab: { fontFamily: font.uiSemibold, fontSize: 11, lineHeight: 14, tabular: false, maxScale: 1.6 }, // tab-bar labels
} as const satisfies Record<string, TypeStep>;

export type TypeStepName = keyof typeof type;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;

/** Layout rhythm: 20 screen gutter, 16 card padding, 14 between cards, 28 before a new section. */
export const layout = { cardPad: 16, stack: 14, section: 28 } as const;

export const radius = {
  xs: 4, // progress ticks
  sm: 6, // small squares
  md: 10, // bogey marker, mini grid cells
  lg: 14, // icon tiles, inner tiles, note bar
  chip: 14, // score chips, time chips
  xl: 20, // cards
  hero: 22, // hero and photo cards
  sheet: 24, // sheet top corners
  pill: 999, // buttons, fields, pills, badges
} as const;

export const hit = {
  min: 48,
  iconButton: 48,
  chip: 48,
  scoreEntry: 62,
  scoreEntryHeight: 76,
  primaryButton: 56,
  secondaryButton: 48,
  /** Filter and time pills: 40pt visual with hitSlop to 48. */
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
  /** Cards carry a 1pt warm hairline (the mockups' cards are outlined, barely shadowed). */
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
  confirmPop: 320, // ms, scale 1 -> 1.08 -> 1 on the hole title
  sheet: 280, // ms, translate/fade
  toggle: 180, // ms
  advance: 350, // ms, pause before auto-advancing to the next hole
  press: 120, // ms, colour/opacity change on press; never a transform
  state: 150, // ms, web transition for background, shadow and opacity on hover/press
} as const;
