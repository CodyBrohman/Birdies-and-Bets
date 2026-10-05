# App Store listing — Birdies & Bets

Golf leads in the listing; the games lead in the product. See build spec §3.3.

## Names

| Field | Value | Limit |
|---|---|---|
| Name | Birdies & Bets: Golf Scorecard | 30 |
| Subtitle | Scorecard, skins, Nassau, Wolf | 30 |
| Bundle ID | com.birdiesandbets.app | |
| Category | Sports | |
| Secondary category | Utilities | |

## Promotional text (170)

The golf scorecard that also runs your group's games. Skins, Nassau, match play, Stableford, Wolf and more, scored live from hole 1.

## Description

Birdies & Bets is a golf scorecard for a group of two to four, with the games you already play layered on top.

Tap a score chip, one hole at a time, and the hole advances itself. See a real scorecard with front nine, back nine, birdies and bogeys marked, and the handicap strokes shown on every hole. Then pick the games your group plays and watch the standings update after every hole: 2 up through 7, three skins carrying, who's in the hot seat.

AFTER THE ROUND
• Every finished round is kept: the full card, the game results and who owes whom
• Share the scorecard as an image to the group chat
• Back up everything to a file and restore it on a new phone

GAME FORMATS
• Skins, with carryover and optional validation
• Nassau: front, back and overall, with automatic presses
• Match Play, played off the low handicap
• Stroke Play, gross or net
• Stableford with configurable points
• Wolf, with rotating wolf and lone-wolf doubles
• Vegas team play
• Bingo Bango Bongo
• Hot Seat, with punishments your group writes

HANDICAPS DONE PROPERLY
Enter each player's index and the app computes the course handicap for the tee you're playing, shows exactly which holes get a stroke, and lets each game score gross or net. Plus handicaps and allowances are handled. Play the front nine, the back nine, or a shotgun start from any hole.

BUILT FOR THE COURSE
• Search thousands of courses and download the scorecard, or add one by hand in a minute
• Works fully offline once a course is loaded
• Every score is saved instantly; close the app and resume where you were
• Screen stays awake during the round
• Cream in the sun, full dark mode for the evening nine

WHAT IT DOESN'T DO
Birdies & Bets keeps a tally of points between players and nothing more. It has no real-money gambling, no deposits, no withdrawals, no payments, and no links to payment services. Settling up is between friends, in the parking lot, as it always was.

No account. No sign-in. Nothing you enter leaves your phone unless you share or back it up.

## Keywords (100)

golf,scorecard,skins,nassau,match play,stableford,wolf,handicap,score,card,vegas,bingo bango bongo

## URLs

- Marketing: https://www.birdiesandbets.com/
- Privacy policy: https://www.birdiesandbets.com/privacy.html
- Support: https://www.birdiesandbets.com/support.html
- Hosting: GitHub Pages on github.com/CodyBrohman/birdies-and-bets-site (the `../website/` folder, its own repo, root of `main`).
  The old `docs/privacy.html` and `docs/support.html` in this repo are redirect stubs to the new site; keep them until every submitted listing points at the new URLs.

## Screenshots (6.9" and 6.5" required)

Order matters for review. Golf first, settlement never first.

1. Card tab, net view, six holes played, birdie and bogey markers visible.
2. Hole screen, hole 7, four players with stroke badges and score chips.
3. Games tab with Skins, Match Play and Hot Seat cards.
4. Players screen showing computed course handicaps, including a plus handicap.
5. Round summary with game results and the settle-up rows.
6. Home with a round in progress and recent rounds.
7. (optional) The shared scorecard image in the share sheet.

Capture from a device or simulator in light mode for 1–4, dark mode for 5–6. See `scripts/screenshots.md`.

## App Privacy questionnaire

Answer "Yes, we collect data from this app", then declare exactly two types. Both match the privacy manifest in
`app.config.ts` and the policy at https://www.birdiesandbets.com/privacy.html.

- **Diagnostics → Crash Data** (Sentry). Used for: App Functionality. Linked to the user: **No.** Used for tracking: **No.**
  On by default, can be turned off in Settings → Privacy.
- **Usage Data → Product Interaction** (Aptabase). Used for: Analytics. Linked to the user: **No.** Used for tracking: **No.**
  Opt-in only.
- Nothing else: no contact info, identifiers, location, user content or purchases. Scores and names never leave the phone.
- The EAS Update check and course search still carry no user data (see the policy).
- Tracking: No. The app shows no App Tracking Transparency prompt because it does not track.

## Age rating questionnaire

Answer honestly. The relevant items:

- Simulated gambling: **Infrequent/Mild.** The app tracks points wagered between friends in golf side games. It does not simulate casino games, and there is no real-money gambling.
- Contests: None.
- Unrestricted web access: No.
- Everything else (violence, sexual content, profanity, drugs, horror): None.

Expected result: 12+ (from the simulated gambling answer). Accept it.

## App Review notes

Paste into the review notes field:

> Birdies & Bets is a golf scorecard. Players enter their stroke counts per hole and the app keeps a traditional scorecard with handicaps. It also tracks the common golf side games (skins, Nassau, match play, Stableford, Wolf, Vegas, Bingo Bango Bongo, Hot Seat) as a tally of points between the players in the group.
>
> The app does not offer or facilitate real-money gambling. It has no payment processing, no in-app purchases, no deposits or withdrawals, no wallet, and no links to payment or money-transfer services. Stakes are abstract "points" that the users themselves agree on. The settlement screen displays a tally and provides no action to pay.
>
> No account is required and no personal data is collected; everything is stored locally on the device. The app's only network use is an update check on launch and, if the user types in the course search box, a course-name lookup.
>
> To try it: Start Round → Cedar Ridge Golf Club is preselected → Blue tees → Continue → enter two names (add an index such as 8.2 to see the handicap) → Choose games → tap Skins → Tee off. Tap + for each player (the first tap fills in par), then Next hole. The front and back nine fill in below, and the games pill on the dark card opens the standings. Finish round on the last hole shows the summary.

## Before submitting

- [ ] Apple Developer Program active
- [ ] `eas build --profile production --platform ios`
- [ ] `eas submit --platform ios`
- [ ] TestFlight round with real golfers on a real course
- [ ] Privacy and support URLs live and reachable
- [ ] The live privacy policy describes crash reports and usage analytics (effective 5 October 2026) before any build that sends them
- [ ] App Store Connect → App Privacy answers updated to Crash Data + Product Interaction (above)
- [ ] Sentry project: "Prevent Storing of IP Addresses" on, data scrubbing on, retention 90 days or less
- [ ] Screenshots uploaded in the order above
