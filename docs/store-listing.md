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

Enter scores with big, glove-friendly steppers, one hole at a time. See a real scorecard with front nine, back nine, birdies and bogeys marked, and the handicap strokes shown on every hole. Then pick the games your group plays and watch the standings update after every hole: 2 up through 7, three skins carrying, who's in the hot seat.

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
Enter each player's index and the app computes the course handicap for the tee you're playing, shows exactly which holes get a stroke, and lets each game score gross or net. Plus handicaps are handled. Nine-hole rounds are handled.

BUILT FOR THE COURSE
• Works fully offline once a course is loaded
• Every score is saved instantly; close the app and resume where you were
• Screen stays awake during the round
• High contrast for sunlight, full dark mode for the evening nine
• Add any course by hand in about a minute

WHAT IT DOESN'T DO
Birdies & Bets keeps a tally of points between players and nothing more. It has no real-money gambling, no deposits, no withdrawals, no payments, and no links to payment services. Settling up is between friends, in the parking lot, as it always was.

No account. No sign-in. No data leaves your phone.

## Keywords (100)

golf,scorecard,skins,nassau,match play,stableford,wolf,handicap,score,card,vegas,bingo bango bongo

## URLs

- Privacy policy: host `docs/privacy.html` (required)
- Support: host `docs/support.html` (required)
- Simplest hosting: a public GitHub repo with Pages enabled on the `docs/` folder. Both pages are self-contained.

## Screenshots (6.9" and 6.5" required)

Order matters for review. Golf first, settlement never first.

1. Card tab, net view, six holes played, markers visible.
2. Play tab, hole 7, four rows with stroke dots, ticker showing three games.
3. Games tab with Skins, Match Play and Hot Seat cards.
4. Players screen showing computed course handicaps, including a plus handicap.
5. Game select with the catalog.
6. Summary with per-game results and the no-money footer visible.

Capture from a device or simulator in light mode for 1–4, dark mode for 5–6.

## App Privacy questionnaire

- Data collected: **None.** No accounts, no analytics, no crash reporting, no third-party SDKs that collect data, no network requests during use.
- Tracking: No.

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
> No account is required and no data is collected or transmitted; everything is stored locally on the device.
>
> To try it: Start Round → choose Cedar Ridge Golf Club → Blue tees → enter two names (add an index such as 8.2 to see the handicap) → Choose games → pick Skins → Start round. Enter a few scores and open the Games and Card tabs.

## Before submitting

- [ ] Apple Developer Program active
- [ ] `eas build --profile production --platform ios`
- [ ] `eas submit --platform ios`
- [ ] TestFlight round with real golfers on a real course
- [ ] Privacy and support URLs live and reachable
- [ ] Screenshots uploaded in the order above
