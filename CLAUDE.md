# Birdies & Bets — iOS golf scorecard that runs the games

Expo SDK 57 · Expo Router · NativeWind 4 · Zustand · TypeScript strict.

## Layering (dependencies flow one way; see spec §10.1)
- `src/types/` imports nothing.
- `src/lib/` imports only `types/`. Pure functions. No React, no RN, no store.
- `src/games/` imports `types/` and `lib/`. One file per game; `registry.ts` is the only file that changes when adding a game.
- `src/store/` imports `types/`, `lib/`, `games/registry`. Orchestrates only.
- `src/app/` and `src/components/` read from the store and `types/`. Never import `games/*` directly.
- `src/components/ui/` imports only `theme/`.
- An import of `react-native` inside `types/`, `lib/` or `games/` is a bug.

## Hard rules
- No money movement, no payment links, no "settle up" action. Settlement is display only.
- Stakes are abstract "points" by default.
- A round with zero games must work end to end.
- Persist the round on every score entry. Offline-first.
- Handicap math and every game module get unit tests.

## Design
Tokens in `src/theme/tokens.ts` are canonical (from the design handoff in
`../Nocturne ruling and scope/`). Fonts: Familjen Grotesk 700 (display), Inter (data, tabular numerals).
Min hit target 44pt; score steppers 56×60; primary CTA 60pt. Nothing lighter than weight 500 or smaller than 13pt.

## Commands
`npm start` · `npm test` · `npm run typecheck`

## Builds
- Expo Go: `npm start` (AsyncStorage backend, no MMKV).
- Development build (MMKV, dev client): `npx eas build --profile development --platform ios` then `npx expo start --dev-client`.
  Needs an Apple Developer account and `npx eas login`. Profiles live in `eas.json`.
- Storage picks MMKV when its native module is present (`src/store/storage/index.ts`), else AsyncStorage. Same keys either way.
