# App Store screenshots

Apple needs 6.9" (1320×2868) and 6.5" (1284×2778) portrait sets. Capture on a simulator; the status bar is
overridden so every shot reads 9:41 with full signal.

## Setup

```
xcrun simctl boot "iPhone 16 Pro Max"            # 6.9"
xcrun simctl boot "iPhone 11 Pro Max"            # 6.5" (or any 6.5" device available)
xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
npx expo run:ios --device "iPhone 16 Pro Max"    # dev build with all native modules
```

Reset the app's data between sets so the seed round is identical: delete the app from the simulator, or use
Settings → Restore with `scripts/seed-backup.json` once one exists.

## Seed round

1. Start Round → Cedar Ridge Golf Club → Blue tees → Continue.
2. Players: Sam 8.4, Priya 14.2, Marcus (blank), Dee +1.8 (a plus handicap). Choose games.
3. Games: Skins (net, 5 pts), Match Play (Sam vs Priya), Hot Seat. Tee off.
4. Score six holes. Vary the scores so the card shows a birdie circle, a bogey square and an eagle double ring.

## Shots (light unless noted)

| # | Screen | Notes |
|---|---|---|
| 1 | Card tab, Net | six holes played, markers visible |
| 2 | Hole tab, hole 7 | four players, stroke badges, chips visible |
| 3 | Games tab | Skins, Match Play, Hot Seat cards |
| 4 | Players step | computed handicaps incl. the plus handicap |
| 5 | Round summary (dark) | finish the round first: use the arrows to reach 18 and score it |
| 6 | Home (dark) | a round in progress and one recent round |
| 7 | Share sheet (optional) | tap Share scorecard on the summary |

Toggle dark mode with the moon button on Home before shots 5 and 6.

## Capture

`Cmd+S` in the simulator saves a PNG to the desktop at device resolution. Name them `01-card-light.png` … and
drop them in `marketing/screenshots/<size>/` (git-ignored except this file).
