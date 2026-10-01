// Birdies & Bets — Tailwind theme for NativeWind.
// Values mirror src/theme/tokens.ts (the typed source of truth). Keep both in step.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class', // theme colors come from tokens + useTheme; NativeWind's web runtime rejects 'media'
  theme: {
    colors: {
      cream: '#F5F4EC',
      card: '#FFFEFA',
      recess: '#ECEEE5',
      chip: { DEFAULT: '#E8EBE2', text: '#3E4A43' },
      hair: { DEFAULT: '#E6E6DC', 2: '#D9DBCF' },
      forest: { DEFAULT: '#17372D', soft: '#5E665F', faint: '#666E66' },
      pine: { DEFAULT: '#245C45', deep: '#1D4D3A', tint: '#DCE8D6', tintText: '#1F4F3B', border: '#B9CDB6' },
      gold: { DEFAULT: '#E7BD5A', marker: '#A87A12', text: '#8A6514', tint: '#F5E7C4', tintText: '#6F5210', border: '#E2CF9C' },
      star: '#A8662B',
      coral: { DEFAULT: '#B3412B', tint: '#F8E3DE', border: '#DAAEA3' },
      tick: '#D3D6CB',
      avatar: { sage: '#DCE8D6', sand: '#F0DDB3', slate: '#DCE1EA', rose: '#EFD9D6' },
      white: '#FFFFFF',
      transparent: 'transparent',
    },
    fontFamily: {
      display: ['Inter_800ExtraBold'],
      serif: ['PlayfairDisplay_900Black'],
      'serif-italic': ['PlayfairDisplay_900Black_Italic'],
      ui: ['Inter_400Regular'],
      'ui-medium': ['Inter_500Medium'],
      'ui-semibold': ['Inter_600SemiBold'],
      'ui-bold': ['Inter_700Bold'],
      mono: ['JetBrainsMono_500Medium'],
      'mono-bold': ['JetBrainsMono_700Bold'],
    },
    fontSize: {
      'display-xl': ['40px', { lineHeight: '44px', letterSpacing: '-1px' }],
      display: ['32px', { lineHeight: '36px', letterSpacing: '-0.9px' }],
      headline: ['21px', { lineHeight: '26px', letterSpacing: '-0.3px' }],
      title: ['16px', { lineHeight: '21px', letterSpacing: '-0.1px' }],
      button: ['16px', { lineHeight: '22px' }],
      score: ['26px', { lineHeight: '30px', letterSpacing: '-0.5px' }],
      total: ['18px', { lineHeight: '22px' }],
      body: ['15px', { lineHeight: '21px' }],
      cell: ['16px', { lineHeight: '21px' }],
      label: ['14px', { lineHeight: '19px' }],
      caption: ['13px', { lineHeight: '17px' }],
      eyebrow: ['11px', { lineHeight: '14px', letterSpacing: '1.4px' }],
      overline: ['11px', { lineHeight: '14px', letterSpacing: '0.8px' }],
      tab: ['11px', { lineHeight: '14px' }],
    },
    spacing: {
      0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 12: '48px',
      hit: '48px', icon: '44px', pill: '40px', entry: '62px', cta: '56px',
    },
    borderRadius: { none: '0px', xs: '4px', sm: '6px', md: '10px', lg: '14px', chip: '14px', xl: '20px', hero: '22px', sheet: '24px', pill: '999px' },
  },
  plugins: [],
};
