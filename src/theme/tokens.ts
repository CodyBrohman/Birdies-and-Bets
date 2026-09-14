// Birdies & Bets — design tokens. Source of truth for the theme layer.
// Values come from the design handoff; tailwind.config.js mirrors them for NativeWind classes.
// Every component reads from here (via useTheme) or from the Tailwind classes. No hard-coded hex elsewhere.

export const base = {
  ink: '#14161F',
  paper: '#EEF0F7',
  paperRaised: '#FBFCFF',
  graphite: '#4A4E60',
  dividerLight: '#C5C9DA',
  chalk: '#E9E9ED',
  nocturne: '#161826',
  nocturneSurface: '#232532',
  nocturneSecondary: '#B2B6CA',
  dividerDark: '#3F424D',
  blurple: '#9184D9',
  blurple700: '#5D5294',
  blurple900: '#2B2741',
  blurpleTint: '#E7E5FE',
  blurpleDeep: '#423A6A',
  blurple300: '#D2CEFD',
  felt: '#1F6B4A',
  feltLight: '#7FD3A6',
  chip: '#A83A33',
  chipLight: '#F08A80',
} as const;

export interface ColorScheme {
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  accent: string;
  accentTint: string;
  accentText: string;
  onAccent: string;
  positive: string;
  positiveTint: string;
  negative: string;
  negativeTint: string;
  strokeMarker: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonPrimaryBorder: string;
  buttonPrimaryPressed: string;
  gridHeader: string;
  gridHeaderText: string;
  gridSubtotal: string;
  currentHole: string;
  scrim: string;
}

export const color: { light: ColorScheme; dark: ColorScheme } = {
  light: {
    surface: base.paper,
    surfaceRaised: base.paperRaised,
    textPrimary: base.ink,
    textSecondary: base.graphite,
    divider: base.dividerLight,
    accent: base.blurple700,
    accentTint: base.blurpleTint,
    accentText: base.blurpleDeep,
    onAccent: '#F5F4FF',
    positive: base.felt,
    positiveTint: '#DCEFE3',
    negative: base.chip,
    negativeTint: '#F7DEDC',
    strokeMarker: base.blurple700,
    buttonPrimary: base.ink,
    buttonPrimaryText: '#F3F5FE',
    buttonPrimaryBorder: base.ink,
    buttonPrimaryPressed: '#3F424D',
    gridHeader: base.ink,
    gridHeaderText: '#F3F5FE',
    gridSubtotal: '#E4E7F5',
    currentHole: base.blurpleTint,
    scrim: 'rgba(20,22,31,0.45)',
  },
  dark: {
    surface: base.nocturne,
    surfaceRaised: base.nocturneSurface,
    textPrimary: base.chalk,
    textSecondary: base.nocturneSecondary,
    divider: base.dividerDark,
    accent: base.blurple,
    accentTint: base.blurple900,
    accentText: base.blurple300,
    onAccent: base.nocturne,
    positive: base.feltLight,
    positiveTint: '#1E3A2E',
    negative: base.chipLight,
    negativeTint: '#4A2523',
    strokeMarker: base.blurple,
    // Dark primary button is an accent-outlined tinted fill (Nocturne convention), not a solid.
    buttonPrimary: base.blurple900,
    buttonPrimaryText: base.chalk,
    buttonPrimaryBorder: base.blurple,
    buttonPrimaryPressed: base.blurpleDeep,
    gridHeader: '#292B31',
    gridHeaderText: base.chalk,
    gridSubtotal: '#292B31',
    currentHole: base.blurple900,
    scrim: 'rgba(0,0,0,0.55)',
  },
};

// Font family names as registered with expo-font (one entry per weight).
export const font = {
  display: 'FamiljenGrotesk_700Bold',
  data: 'Inter_500Medium',
  dataSemibold: 'Inter_600SemiBold',
  dataBold: 'Inter_700Bold',
} as const;

export type FontFamily = (typeof font)[keyof typeof font];

export interface TypeStep {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  /** Tabular lining figures are mandatory on this step (scores, grids, totals). */
  tabular: boolean;
}

// Sizes in pt. Weight is baked into the family name.
export const type = {
  displayXl: { fontFamily: font.display, fontSize: 40, lineHeight: 44, tabular: false }, // "Hole 7"
  display: { fontFamily: font.display, fontSize: 28, lineHeight: 32, tabular: false }, // screen titles
  headline: { fontFamily: font.display, fontSize: 24, lineHeight: 28, tabular: false }, // standings line
  title: { fontFamily: font.display, fontSize: 22, lineHeight: 26, tabular: false }, // card titles
  button: { fontFamily: font.display, fontSize: 20, lineHeight: 24, tabular: false }, // primary CTA label
  score: { fontFamily: font.dataBold, fontSize: 34, lineHeight: 36, tabular: true }, // stepper value
  total: { fontFamily: font.dataBold, fontSize: 18, lineHeight: 22, tabular: true }, // totals
  body: { fontFamily: font.data, fontSize: 17, lineHeight: 22, tabular: false },
  bodyStrong: { fontFamily: font.dataBold, fontSize: 17, lineHeight: 22, tabular: false }, // player names
  cell: { fontFamily: font.dataSemibold, fontSize: 16, lineHeight: 20, tabular: true }, // scorecard cell
  label: { fontFamily: font.dataSemibold, fontSize: 15, lineHeight: 20, tabular: false },
  caption: { fontFamily: font.dataSemibold, fontSize: 13, lineHeight: 16, tabular: true }, // floor
  tab: { fontFamily: font.dataBold, fontSize: 12, lineHeight: 14, tabular: false }, // tab bar only
} as const satisfies Record<string, TypeStep>;

export type TypeStepName = keyof typeof type;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;

export const radius = {
  xs: 4, // bogey square marker, progress ticks
  sm: 6, // basis badge, small chips
  md: 10, // controls: stepper buttons, segmented, inputs, back buttons
  lg: 14, // cards, primary button
  xl: 20, // sheet top corners
  pill: 999, // hole badge, toggle, recent-player chips
} as const;

export const hit = {
  min: 44,
  scoreEntry: 56,
  scoreEntryHeight: 60,
  primaryButton: 60,
  secondaryButton: 48,
} as const;

export interface ElevationSet {
  /** CSS-style box shadow, supported natively on iOS (new architecture) and on web. */
  raised: { boxShadow: string };
  sheet: { boxShadow: string };
}

// "flat" is a hairline border, handled by components. Values from the design handoff.
export const elevation: { light: ElevationSet; dark: ElevationSet } = {
  light: {
    raised: { boxShadow: '0 1px 2px rgba(20,22,31,0.08)' },
    sheet: { boxShadow: '0 -8px 32px rgba(20,22,31,0.22)' },
  },
  dark: {
    raised: { boxShadow: 'none' },
    sheet: { boxShadow: '0 0 0 1px #595D6C, 0 -16px 40px rgba(0,0,0,0.65)' },
  },
};

export const motion = {
  confirmPop: 320, // ms, scale 1 -> 1.12 -> 1 on the CTA
  sheet: 280, // ms, translate/fade
  toggle: 180, // ms
} as const;
