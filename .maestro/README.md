# Maestro smoke flow

`smoke.yaml` installs nothing and needs no network. It covers the fresh-install path:

1. skip the intro
2. pick Cedar Ridge
3. add a player
4. start the round
5. score hole 1 with the stepper
6. go to hole 2
7. go back Home and check "Back to your round"
8. return to the scorecard

It finds elements by `testID` (see the ids in the flow) and by visible text.

## Run it

- **GitHub (free, no Mac needed):** go to Actions → **e2e iOS smoke** → Run workflow. The workflow builds a Release
  simulator app on a GitHub Mac, boots an iPhone simulator and runs the flow. A run takes 20–40 minutes. The report
  and failure screenshots are attached to the run as `maestro-results`.
- **EAS (paid Expo plan only):** `npx eas workflow:run .eas/workflows/e2e-ios.yml`, which uses the `e2e-test`
  build profile.
- **On a Mac:** install Maestro (`curl -Ls "https://get.maestro.mobile.dev" | bash`), run the app in a simulator
  (`npx expo run:ios`), then `maestro test .maestro/smoke.yaml`.

## Changing screens

If you rename a `testID` or change visible text the flow uses, update `smoke.yaml` too. The ids are:
- `onboarding-skip`, `tab-courses`
- `add-first-friend`, `friend-name`, `save-friend`, `start-round`
- `stepper-plus-0`, `next-hole`, `current-hole`, `round-home`
