# Birdies & Bets — iOS golf scorecard that runs the games

Expo SDK 57 · Expo Router · NativeWind 4 · Zustand · TypeScript strict.

## Layering (dependencies flow one way; see spec §10.1)
- `src/types/` imports nothing.
- `src/lib/` imports only `types/`. Pure functions. No React, no RN, no store.
- `src/games/` imports `types/` and `lib/`. One file per game; `registry.ts` is the only file that changes when adding a game.
- `src/store/` imports `types/`, `lib/`, `games/registry`. Orchestrates only.
- `src/app/` and `src/components/` read from the store and `types/`. Never import `games/*` directly.
- `src/components/ui/` imports only `theme/`.
- `src/services/` is the only layer that uses `fetch` (course search via the Cloudflare Worker in `../worker/`).
  It may import `types/`, `lib/` and `store/`; nothing below it may import it. Screens call it directly.
- `src/theme/` never imports `store/`; the theme preference lives in `theme/preference.ts`, persistence in `store/themeStore.ts`.
- Persisted data is versioned: bump `SCHEMA_VERSION` in `src/store/storage/adapter.ts` and add a migration in
  `storage/migrate.ts` whenever a stored shape changes.
- An import of `react-native` inside `types/`, `lib/` or `games/` is a bug.

## Hard rules
- No money movement, no payment links, no "settle up" action. Settlement is display only.
- Stakes are abstract "points" by default.
- A round with zero games must work end to end.
- Persist the round on every score entry. Offline-first.
- Handicap math and every game module get unit tests.

## Design
The 2026-10-01 redesign matches the owner's ten reference mockups. Tokens in `src/theme/tokens.ts` are canonical, and
`design-system/birdies-and-bets/MASTER.md` explains them.
- **Palette** (light only; `color.dark` aliases light): cream ground `#F5F4EC`, warm white hairline cards, forest ink
  `#17372D`, pine `#245C45` for buttons and selected pills, dark forest hero cards, a gold `#E7BD5A` HCP badge.
  Pine = good/under par, gold = over par, coral = errors only.
- **Type:** Inter only. Display 32 bold titles under a green uppercase eyebrow, section titles 21, body 15. 11pt is the
  floor, for eyebrows, badges and tabs only.
- **Shape:** cards radius 20 with a hairline; hero and photo cards 22; buttons rounded rectangles (16/12); filter pills
  are pills.
- **Tabs:** Home · Courses · Bet (round builder) · Friends · Profile. Settings is a stack screen opened from Profile.
- **Logos:** `assets/logo.png` is the master chip (`logo-mark.png` is the same art with the faint square trimmed; it
  feeds BrandMark, the splash, the favicon and the website). `assets/app-logo.png` is the app icon source; `icon.png` is
  derived from it, opaque, with the corners filled.
- **Kit additions:** ScreenHeader, HeroCard, PhotoCard, StickyBar, ListRow, IconTile, NoteBar, AvatarStack.
- **ListRow:** put interactive pieces in `action`/`footer`, never inside the row (no nested buttons on web).
- **Photos:** brand photos live in `assets/photos` (shared with the website). `components/courseArt.ts` picks one per
  course.
- **Profile extras** (home area, photo, bag) live in preferences. A tee time is an optional `RoundSettings.teeTime`.
  Crew helpers are in `store/crew.ts`.
- Min hit target 48pt (pills 40 + hitSlop). Ionicons outline. States live in `components/ui/interaction.ts`.

## Telemetry
- `src/services/telemetry.ts` is the only file that imports Sentry or Aptabase (an architecture test enforces it).
  Screens call `track(...)`, the `trackRound*` helpers and `captureError`.
- Crash reports (Sentry) are on by default behind the `crashReports` preference. Usage analytics (Aptabase) send only
  when `analytics === true` (asked once in onboarding, or once on Home for older installs).
- Events are a fixed typed list (`TelemetryEvents`) of counts and game ids. Never names, scores, course names or free text.
  A new event means updating the privacy policy (website repo) and `docs/store-listing.md` too.
- Keys: `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_APTABASE_KEY` (see `.env.example`). Without them nothing is sent.

## Card links
- Sharing a card sends the PNG plus `https://www.birdiesandbets.com/card#v1.<payload>`. The round lives in the fragment,
  so no server sees it. The format is `src/lib/cardLink.ts` (`CardData` v1).
- The website decodes the same format in `../website/assets/js/card.js`. A format change means adding v2 and updating
  both decoders. Never change v1 in place, because links already sent must keep working.
- In the app, `src/app/+native-intent.tsx` rewrites `/card#…` to `/card?d=…` for `app/card.tsx`, which is read-only and
  saves nothing. Universal links need `ios.associatedDomains` (a native build) plus the site's
  `.well-known/apple-app-site-association`.
- Rating prompt: `services/rating.ts`, asked once after the third finished round (the `reviewPrompted` preference).

## Tests
- Logic tests sit next to their code (`*.test.ts`). Screen tests live in `src/test/screens/*.test.tsx`, never under
  `src/app/`, because Expo Router would treat them as routes.
- Screen tests render real screens with `renderScreens(routes, url)` from `src/test/screen.tsx` (Expo Router's
  `renderRouter`). Seed state with `seedRound` / `seedPrefs` and call `resetStores` in `beforeEach`.
- Query by role and accessibility label, as VoiceOver would. Use `testID` only for the Maestro flow (`.maestro/`).
- Testing Library stays on v13: Expo Router's `renderRouter` calls the sync `render`, which v14 made async.
- CI: `.github/workflows/ci.yml` runs typecheck and Jest on push and PR. The Maestro smoke flow runs on demand with
  `.github/workflows/e2e-ios.yml` (GitHub macOS, free for this public repo). See `.maestro/README.md`.

## Commands
`npm start` · `npm test` · `npm run test:screens` · `npm run typecheck`

## Builds
- Expo Go: `npm start` (AsyncStorage backend, no MMKV).
- Development build (MMKV, dev client): `npx eas build --profile development --platform ios` then `npx expo start --dev-client`.
  Needs an Apple Developer account and `npx eas login`. Profiles live in `eas.json`.
- Storage picks MMKV when its native module is present (`src/store/storage/index.ts`), else AsyncStorage. Same keys either way.
