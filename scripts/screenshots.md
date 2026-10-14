# App Store screenshots

A script makes them, not a person with a simulator, so every build gives the same six pictures from the same data.

## What they show (App Store order)

Golf first; the points tally is never the first picture.

| File | Screen | On it |
|---|---|---|
| `01-round.png` | The round in progress | Hole 17 at Harbour Pines, four players with their scores, the hole chips, the standings line, and the Wolf prompt ("Alex Morgan is the wolf") |
| `02-scorecard.png` | A finished round's page | Who won, Player · Gross · Net · Pts, and the paper scorecard in net: circles, squares, stroke dots, OUT / IN / TOT |
| `03-standings.png` | Standings | "Maya Chen leads with 5 skins" with the hole-by-hole strip, then the Nassau (Alex v Sam) |
| `04-new-round.png` | New round | Maple Hollow, White tees, a tee time tomorrow at 8:10, four players with HCP and CH, Skins and a 2 v 2 Nassau |
| `05-results.png` | Results | The round just finished: the winner, the table, the games, and Save round |
| `06-home.png` | Home | The round in progress, the year in numbers (3 rounds, best 81, +7 points), recent rounds |

## The demo data

`src/store/demo.ts`. A build made with `EXPO_PUBLIC_DEMO_DATA=1` writes it on first launch, only when nothing is
saved yet:
- five people, with Alex Morgan as you;
- two made-up courses (Harbour Pines Golf Club, Maple Hollow Golf Club) on the bundled sample course's holes;
- three finished rounds;
- a round in progress on hole 17 of 18 with Skins, Nassau and Wolf;
- a New round draft for tomorrow.

The rounds go through the app's own game modules and round summaries, so every number on screen is one the app worked
out. `src/store/demo.test.ts` checks the data loads into every store and looks like real golf.

The flag is inlined into the JavaScript at build time. Only the screenshot workflow sets it; the `eas.json` profiles
never do, so no TestFlight or App Store build carries the demo data.

## Make them on GitHub (no Mac needed)

1. Push the commit you want pictured.
2. GitHub → Actions → **App Store screenshots** → Run workflow (`.github/workflows/screenshots-ios.yml`). It takes
   about 30 to 45 minutes, most of it the Release build.
3. Download the run's `app-store-screenshots` artifact. It holds two folders of six PNGs each:
   - `dynamic-island-large/`: 6.9-inch, 1320 × 2868 (iPhone 17 Pro Max, or 16 Pro Max).
   - `dynamic-island-medium/`: 6.3-inch, 1206 × 2622 (iPhone 17 Pro, or 16 Pro).

   The status bar reads 9:41 with full signal and battery, and the alpha channel is removed.
4. In App Store Connect → the app → the iOS version → **Previews and Screenshots**, drag the PNGs in file order:
   - `dynamic-island-large/` into **iPhone with Dynamic Island (large display)**;
   - `dynamic-island-medium/` into **iPhone with Dynamic Island (medium display)**.

   App Store Connect scales the other iPhone sizes from these.

If a step fails, the `maestro-logs` artifact has Maestro's screenshots of where it stopped.

## Make them on a Mac

Install Xcode and Maestro (`curl -Ls "https://get.maestro.mobile.dev" | bash`). Then, from the repo root:

```
npx expo prebuild --platform ios --clean
EXPO_PUBLIC_DEMO_DATA=1 xcodebuild -workspace ios/*.xcworkspace -scheme <the scheme prebuild made> \
  -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO
scripts/screenshots-ios.sh dynamic-island-large "iPhone 17 Pro Max" "iPhone 16 Pro Max"
scripts/screenshots-ios.sh dynamic-island-medium "iPhone 17 Pro" "iPhone 16 Pro"
```

`screenshots-ios.sh` does the following, and leaves the PNGs in `screenshots/` (git-ignored):
1. creates a fresh simulator and sets the status bar;
2. installs `build/`'s app and runs `.maestro/screenshots.yaml`;
3. removes the alpha channel;
4. deletes the simulator.

## Rules

From Apple's Screenshot specifications (App Store Connect Help, 2026):
- PNG or JPEG, from 1 to 10 per size.
- "Images can't include alpha channels or transparencies" (since July 2026). The script flattens every PNG.
- When the interface is the same on every size, App Store Connect scales the largest set down. This app's layout is,
  so the two sets above are enough.

Our own:
- Show the app in use, with no real person's name and no real club's name or logo. The demo names and both course
  names are made up.

## When a screen changes

The flow finds its way by test ids. If one of these is renamed or removed, update `.maestro/screenshots.yaml`:

| Screen | Test ids |
|---|---|
| Home | `resume-round`, `tab-home`, `round-<id>` |
| The round | `current-hole`, `open-standings`, `next-hole`, `everyone-par`, and the Wolf chip labelled "The wolf went: Alone" |
| Results | `save-round` |
| Play tab | `tab-play`, `start-round` |
| A round's page | `scorecard-in` |

The Standings sheet is photographed without being read: a sheet over the round is missing from the hierarchy Maestro
reads on iOS, so the flow pauses, takes the picture and restarts the app to close it.

If the demo data changes (`src/store/demo.ts`), update the table at the top. The website's screenshots
(`../website/assets/img/`) are separate: see `scripts/website-shots/`.
