// Birdies & Bets — Tailwind theme for NativeWind.
// Values mirror src/theme/tokens.ts (the typed source of truth). Keep both in step.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class', // theme colors come from tokens + useColorScheme; NativeWind's web runtime rejects 'media'
  theme: {
    colors: {
      ink: '#14161F',
      paper: { DEFAULT: '#EEF0F7', raised: '#FBFCFF' },
      graphite: '#4A4E60',
      chalk: '#E9E9ED',
      nocturne: { DEFAULT: '#161826', surface: '#232532', secondary: '#B2B6CA' },
      divider: { light: '#C5C9DA', dark: '#3F424D' },
      blurple: { 300: '#D2CEFD', 500: '#9184D9', 700: '#5D5294', 900: '#2B2741', tint: '#E7E5FE', deep: '#423A6A' },
      felt: { DEFAULT: '#1F6B4A', light: '#7FD3A6', tint: '#DCEFE3', tintDark: '#1E3A2E' },
      chip: { DEFAULT: '#A83A33', light: '#F08A80', tint: '#F7DEDC', tintDark: '#4A2523' },
      transparent: 'transparent',
    },
    fontFamily: {
      display: ['FamiljenGrotesk_700Bold'],
      data: ['Inter_500Medium'],
      'data-semibold': ['Inter_600SemiBold'],
      'data-bold': ['Inter_700Bold'],
    },
    fontSize: {
      'display-xl': ['40px', { lineHeight: '44px' }],
      display: ['28px', { lineHeight: '32px' }],
      headline: ['24px', { lineHeight: '28px' }],
      title: ['22px', { lineHeight: '26px' }],
      score: ['34px', { lineHeight: '36px' }],
      total: ['18px', { lineHeight: '22px' }],
      body: ['17px', { lineHeight: '22px' }],
      cell: ['16px', { lineHeight: '20px' }],
      label: ['15px', { lineHeight: '20px' }],
      caption: ['13px', { lineHeight: '16px' }],
    },
    spacing: {
      0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 12: '48px',
      hit: '44px', entry: '56px', cta: '60px',
    },
    borderRadius: { none: '0px', xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '20px', pill: '999px' },
  },
  plugins: [],
};
