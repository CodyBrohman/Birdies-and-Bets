# Maestro smoke flow

`smoke.yaml` installs nothing and needs no network. It covers the fresh-install path:

1. if the build has Supabase keys, choose Continue without an account on the welcome screen
2. skip the intro
3. on the Play tab, choose Sample course
4. add a player in the Players sheet
5. start the round
6. score hole 1 with the stepper
7. go to hole 2
8. close the round, open Home and check Resume round
9. return to the scorecard

It finds elements by `testID` (see the ids in the flow) and by visible text.

## Run it

- **GitHub (free, no Mac needed):** go to Actions → **e2e iOS smoke** → Run workflow. The workflow builds a Release
  simulator app on a GitHub Mac, boots an iPhone simulator and runs the flow. A run takes 20–40 minutes. The report
  and failure screenshots are attached to the run as `maestro-results`. To cover the welcome screen too, add
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as repository secrets (Settings → Secrets and variables
  → Actions); without them the build has no accounts and starts at the intro.
- **EAS (paid Expo plan only):** `npx eas workflow:run .eas/workflows/e2e-ios.yml`, which uses the `e2e-test`
  build profile.
- **On a Mac:** install Maestro (`curl -Ls "https://get.maestro.mobile.dev" | bash`), run the app in a simulator
  (`npx expo run:ios`), then `maestro test .maestro/smoke.yaml`.

## Changing screens

If you rename a `testID` or change visible text the flow uses, update `smoke.yaml` too. The ids are:
- `continue-without-account`, `onboarding-skip`, `tab-play`
- `choose-course`, `add-player`, `friend-name`, `save-friend`, `sheet-close`, `start-round`
- `stepper-plus-0`, `next-hole`, `current-hole`, `round-home`, `tab-home`, `resume-round`

# App Store screenshots (.maestro/screenshots.yaml)

Not a test: it drives a demo-data build (`EXPO_PUBLIC_DEMO_DATA=1`, see `src/store/demo.ts`) through six screens and
saves a screenshot of each:
1. Home
2. the round in progress on hole 17
3. Standings
4. Results (after hole 18)
5. New round
6. a finished round's scorecard

Run it with `scripts/screenshots-ios.sh`, or on GitHub with Actions → **App Store screenshots**. Both are described in
`scripts/screenshots.md`.

Its ids, besides the smoke flow's:
- `resume-round`, `current-hole`, `open-standings`
- `next-hole`, `everyone-par`, the Wolf chip "The wolf went: Alone", `save-round`
- `tab-play`, `start-round`, `tab-home`
- `round-<round id>` on round rows, `scorecard-in` on a round's page
