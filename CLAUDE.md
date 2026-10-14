# Birdies & Bets — iOS golf scorecard that runs the games

Expo SDK 57 · Expo Router · Zustand · TypeScript strict. Styling is React Native StyleSheet with `src/theme` tokens.

## Layering (dependencies flow one way; see spec §10.1)
- `src/types/` imports nothing.
- `src/lib/` imports only `types/`. Pure functions. No React, no RN, no store.
- `src/games/` imports `types/` and `lib/`. One file per game; `registry.ts` is the only file that changes when adding a game.
- `src/store/` imports `types/`, `lib/`, `games/registry`. Orchestrates only.
- `src/app/` and `src/components/` read from the store and `types/`. Never import `games/*` directly.
- `src/components/ui/` imports only `theme/`.
- `src/services/` is the only layer that uses `fetch` (course search via the Cloudflare Worker in `../worker/`).
  It may import `types/`, `lib/` and `store/`; nothing below it may import it. Screens call it directly.
- `src/theme/` never imports `store/`. The app is light only; there is no theme preference.
- Persisted data is versioned: bump `SCHEMA_VERSION` in `src/store/storage/adapter.ts` and add a migration in
  `storage/migrate.ts` whenever a stored shape changes.
- An import of `react-native` inside `types/`, `lib/` or `games/` is a bug.

## Hard rules
- No money movement, no payment links, no "settle up" action. Settlement is display only.
- Accounts are optional (2026-10-14). With Supabase keys set, the welcome screen offers Sign in with Apple, an emailed
  code, or "Continue without an account" (status `local`: everything works on the phone; signing in later uploads it).
  Without keys the app runs local-only (status `disabled`, no account UI), which is what tests and the Maestro e2e build use.
- The app never signs out by itself and never waits on the network to open: a lapsed session keeps the data and asks
  to sign in again (`sessionExpired`). Another account's data on a phone is never uploaded without asking.
- Stakes are abstract "points" by default.
- A round with zero games must work end to end.
- Persist the round on every score entry. Offline-first.
- Handicap math and every game module get unit tests.

## Design
2026-10-14: evolve the look, drop the template patterns, go native. `design-system/birdies-and-bets/MASTER.md` holds the
ten rules, the voice and glossary, and the screen anatomy; `src/theme/tokens.ts` is canonical. Every screen was rebuilt
to it on 2026-10-14 (TODO.md Phase 3); keep new screens to the same kit.
- **Rules in short:** no eyebrow/tagline headers (native titles); facts, not filler copy; no stock or AI photos; one
  dark surface (the round in progress); inset-grouped lists before cards; SF Symbols, no icon tiles, no arrows in
  buttons; colour means something and never alone; uppercase only in scorecard headers; one primary button, at the
  bottom; native controls first. UI copy never says settle up / owes / pays / wager / bet.
- **Palette** (light only): cream ground `#F5F4EC`, white cells, forest ink `#17372D`, pine `#245C45` (actions, under
  par), gold (over par), coral (destructive, errors). Four seat colours mark players in a round.
- **Type:** the iOS system font (SF Pro); weights come from the step, on the iOS ramp (largeTitle, title1-3, rowTitle,
  rowBody (the default), callout, subhead, footnote, caption1-2, tableHeader, scoreXL/Lg/Md, cellMd). Never a numeric
  fontSize in a screen.
- **Tabs:** Home · Courses · Play (the new-round form, `/play`) · Friends · Profile, on the native tab bar
  (`expo-router/unstable-native-tabs`, `app/(tabs)/_layout.tsx`); the web preview uses JS tabs (`_layout.web.tsx`).
  Each tab is a route group with its own stack (`(home)`, `(courses)`, `(play)`, `(friends)`, `(profile)`; Settings
  lives in `(profile)` and keeps `/settings`). Round history is shared by three tabs: `(home,courses,friends)/history`
  pushes inside whichever tab you are on. Plain paths switch tabs (`/play`, `/courses`). The live round, new-round
  editors, sign-in, onboarding and the shared card stay in the root stack, over the tabs.
- **Round in progress on every tab:** iOS 26 shows it in the tab bar's bottom accessory (`LiveRoundAccessory`); older iOS
  and the web show `LiveRoundBanner` at the top of each tab root. `useLiveRound()` summarises it.
- **Native headers:** `TabStack` (`stackOptions`) styles each stack (cream, pine tint) with headers off; a screen turns its
  header on through `ScrollScreen` (large title on tab roots, `headerTitle` for a two-line title, `footer` for the one
  pinned primary button).
- **Sheets are routes** (form sheets, registered with `formSheet()` in the layout that owns them; inside, `SheetScreen`
  draws Cancel · title · Save or title · Done). Root-stack sheets: round setup in `app/new-round/` (`course`,
  `players`, `add-game`, `game/[gameId]`, `options`, `games`), `friend/add`, `group/[id]`, `handicap`,
  `home-course`. With `?target=round` the game and option sheets edit the
  round in progress instead of the draft (`useGamesTarget`), so the live round reuses them. The round's own sheets
  (`round/standings`, `round/note`) are in `round/_layout.tsx`.
- **Logos:** `assets/logo.png` is the master chip (`logo-mark.png` is the same art with the faint square trimmed; it
  feeds BrandMark, the splash, the favicon and the website). `assets/app-logo.png` is the app icon source; `icon.png` is
  derived from it, opaque, with the corners filled.
- **Confirmations:** `confirm()` / `ask()` from `@/components/ui` (native Alert, destructive in coral). Screen tests answer
  them with `pressAlert(label)` from `src/test/screen.tsx`.
- **Interaction:** always import `Pressable` from `@/components/ui` (one pressed state). Never nest Pressables (web errors
  on button inside button): put a row's control beside the pressable part, not inside it. Min target 44pt.
- **Kit (2026-10-14):** `Icon` (semantic names → SF Symbols, Ionicons fallback; decorative unless given a label),
  `ListSection`/`ListItem` (inset grouped; value, chevron, check or switch; `action` rows in pine; `destructive` in coral;
  long-press `menu` shown with `actionSheet()` and offered to VoiceOver as actions), `FormRow`, `SearchField`,
  `Switch`, `SegmentedControl`, `DateTimeField` (native), `Button` (primary, secondary, plain, hero; `destructive`),
  `HeaderButton`, `BasisTag`, `Avatar` (seat colour in a round). Scorecard: `NineCard` and `ScoreMark` (circles and
  squares). Results: `RoundReport` (shared by Results and a round's page). Screen tests answer action sheets with
  `await pressAction(label)`.
- **Profile extras:** the photo and `homeCourseId` live in preferences (the 2026-10-01 home area and bag are still
  stored and synced, but nothing shows them). A tee time is an optional
  `RoundSettings.teeTime`. Crew helpers are in `store/crew.ts`. The draft round persists (`bb:round:draft`).

## Telemetry
- `src/services/telemetry.ts` is the only file that imports Sentry or Aptabase (an architecture test enforces it).
  Screens call `track(...)`, the `trackRound*` helpers and `captureError`.
- Crash reports (Sentry) are on by default behind the `crashReports` preference. Usage analytics (Aptabase) send only
  when `analytics === true` (asked once in onboarding, or once on Home for older installs).
- Events are a fixed typed list (`TelemetryEvents`) of counts and game ids. Never names, scores, course names or free text.
  A new event means updating the privacy policy (website repo) and `docs/store-listing.md` too.
- Keys: `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_APTABASE_KEY` (see `.env.example`). Without them nothing is sent.

## Backend (Supabase), phase 1: accounts and sync
- The schema is `supabase/migrations/0001_init.sql` (re-runnable). Tables `profiles`, `rounds` (history and the round in
  play, keyed by round id, `status`), `people`, `player_groups`, `courses`, `user_settings`. Each row holds the app's
  own JSON in `data`, with `updated_at` (phone edit time, used for last-write-wins), `deleted_at` (tombstone) and
  `synced_at` (server time, used for pulls). RLS: owner only. `delete_my_account()` RPC.
- `services/sync.ts` watches the stores and diffs snapshots, so stores need no sync code. Changes queue in a persisted
  outbox, which flushes when debounced, on foreground and when signal returns. Pulls write into the stores with echo
  suppressed. A new phone pulls first, then uploads what the account lacks (only after a pull got through). The pure
  rules are in `lib/sync.ts`.
- Write errors are classified (`classifySyncError`): network/5xx back off and retry; auth errors pause sync until the
  same person signs in again (`resumeSync`); a row the server refuses is set aside in `meta.rejected` (Settings › Retry)
  so it never blocks the queue. Pulls re-read 5 minutes back. `supabase/migrations/0002_sync_guards.sql` makes the
  server keep the newest edit too (`keep_newest` trigger) and caps phone clocks at now + 5 min.
- Never cap or trim a synced collection in a store: sync reads a dropped entity as a delete and removes it from the
  account on every phone (history had a 50-round cap until 2026-10-14).
- Restoring a backup while signed in merges it with the account (`restoreWithSync`); local-only restore replaces.
- Adding a synced collection means a `TABLES` entry in `services/sync.ts` and a table in a new migration.
- Auth: `services/auth.ts`, state in `store/authStore.ts`, `app/sign-in.tsx`. The choice is remembered in `bb:auth`
  (`local`, or the account), so launch reads storage only. The root layout closes the app routes only when
  `signed-out`; sign-in stays reachable whenever a backend exists (welcome screen, or a sheet from Settings/Profile).
- Sign-out sends unsynced changes first and returns the count it could not send (the screen then asks); it ends the
  session on this phone only (`scope: 'local'`) and removes the stored session even offline.
- Delete account goes through the `delete-account` Edge Function (`supabase/functions/`), which revokes Sign in with
  Apple tokens first (Apple asks the person once more for a one-time code; nothing Apple is stored) and deletes nothing
  unless Apple confirms. `delete_my_account()` is no longer callable by users. Deploy with
  `npx supabase functions deploy delete-account`; secrets APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_PRIVATE_KEY.
  `supabase/functions` is Deno code, excluded from tsc and eslint; its pure Apple logic is tested from
  `src/services/deleteAccount.test.ts`.
- Phase 2 (shared live rounds) and phase 3 (friends feed) are planned. See the plan notes in `Next items to do.txt`.

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

OTA updates: `npm run publish:preview -- "what changed"` (or `publish:production`). It publishes, then uploads the
source maps to Sentry. Builds upload them by themselves (preview and production profiles).

## Builds
- Expo Go: `npm start` (AsyncStorage backend, no MMKV).
- Development build (MMKV, dev client): `npx eas build --profile development --platform ios` then `npx expo start --dev-client`.
  Needs an Apple Developer account and `npx eas login`. Profiles live in `eas.json`.
- Storage picks MMKV when its native module is present (`src/store/storage/index.ts`), else AsyncStorage. Same keys either way.
