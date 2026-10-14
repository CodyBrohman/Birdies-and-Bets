# App Store listing — Birdies & Bets

Golf leads in the listing; the games come second, and the word "points" carries the money question. Rewritten
2026-10-14 for the v1 app: optional accounts, light only, −/+ steppers, the native tab bar, points-only wording.

## Names

| Field | Value | Limit |
|---|---|---|
| Name | Birdies & Bets: Golf Scorecard | 30 |
| Subtitle | Scorecard, skins, Nassau, Wolf | 30 |
| Bundle ID | com.birdiesandbets.app | |
| Category | Sports | |
| Secondary category | Utilities | |

## Promotional text (170)

A golf scorecard that also keeps your group's games. Skins, Nassau, match play, Stableford, Wolf and more, scored as you play, as a points tally.

## Description

Birdies & Bets is a golf scorecard for one to four players, with the games your group already plays kept alongside it.

SCORE AS YOU PLAY
• One hole at a time: tap the number for par, − for a birdie, + for a bogey, then keep tapping
• Four players fit on one screen, with "Everyone par" for the easy holes
• The card fills in like a paper scorecard: circles for birdies, squares for bogeys, dots for handicap strokes
• Every tap is saved at once, even with no signal; close the app and pick up where you left off
• Front nine, back nine, or a shotgun start from any hole

THE GAMES
• Skins, with carryover and optional validation
• Nassau: front, back and overall, with optional presses
• Match Play, singles or two against two
• Stroke Play, gross or net
• Stableford: standard, modified or your own points
• Wolf, with an optional double for a lone wolf
• Vegas for two teams of two
• Bingo Bango Bongo
• Hot Seat, with punishments your group writes

Standings update after every hole in plain words: "Maya leads with 3 skins", "Jay 2 up thru 7". At the end, Results shows who won, the gross and net scores, every game, and a points tally between the players.

HANDICAPS DONE PROPERLY
Enter each player's handicap index and the app works out the course handicap for the tees you play, shows which holes get a stroke, and lets each game play gross or net. Plus handicaps and allowances are handled.

AFTER THE ROUND
• Every round is kept: the full card, the games and the notes
• Share the result to the group chat as an image, with a link to the full card
• See your record with each friend, and your best at each course

COURSES
• A sample course is built in, so you can try it with no signal
• Search a course directory and download the scorecard, or add a course by hand in a few minutes

ACCOUNTS ARE OPTIONAL
Use it with no account: everything stays on your iPhone. Sign in with Apple or an emailed code to keep your rounds in sync across phones and safe when you change phones. Back up to a file any time.

POINTS, NOT MONEY
Birdies & Bets keeps a tally of points between players and nothing more. There is no real-money gambling, no deposits or withdrawals, no payments, no prizes, and no links to payment services.

## Keywords (100)

golf,scorecard,skins,nassau,match play,stableford,wolf,handicap,score card,points,vegas,golf games

## URLs

- Marketing: https://www.birdiesandbets.com/
- Privacy policy: https://www.birdiesandbets.com/privacy.html
- Support: https://www.birdiesandbets.com/support.html
- Hosting: GitHub Pages on github.com/CodyBrohman/birdies-and-bets-site (the `../website/` folder, its own repo, root of `main`).
  The old `docs/privacy.html` and `docs/support.html` in this repo are redirect stubs to the new site; keep them until every submitted listing points at the new URLs.

## Screenshots

Two sets, made by the "App Store screenshots" GitHub workflow from demo data (see `scripts/screenshots.md`):
**iPhone with Dynamic Island (large display)**, 1320 × 2868, and **(medium display)**, 1206 × 2622. App Store Connect
scales the other iPhone sizes from these. No alpha channel (an App Store Connect rule since July 2026). Light mode only;
the app has no dark mode. Order matters for review: golf first, the points tally never first.

1. The round in progress: hole 17, four players with their scores, the hole chips, the standings line, the Wolf prompt.
2. A round's page: who won, Player · Gross · Net · Pts, and the paper scorecard in net (circles, squares, stroke dots,
   OUT / IN / TOT).
3. Standings: "Maya Chen leads with 5 skins" with the hole-by-hole strip.
4. New round: course, tees, tee time, players with their handicaps, games.
5. Results: who won, Player · Gross · Net · Pts.
6. Home with the round in progress, the year in numbers and recent rounds.

## App Privacy questionnaire

Answer "Yes, we collect data from this app", then declare the types below. They match the privacy manifest in
`app.config.ts` and the policy at https://www.birdiesandbets.com/privacy.html. An account is optional, but the questions
ask what the app can collect, so the account data is declared.

Account data (Supabase, only when someone signs in). All of these are **linked to the user**, used for **App
Functionality** only, and **not used for tracking**:
- **Contact Info → Name**: the display name, and the name Apple shares if the person allows it.
- **Contact Info → Email Address**: for email sign-in, or Apple's relay address.
- **Identifiers → User ID**: the account id.
- **User Content → Other User Content**: rounds, scores, the player names and indexes the person enters, courses and settings.

Anonymous data, **not linked**:

- **Diagnostics → Crash Data** (Sentry). Used for: App Functionality. Linked to the user: **No.** Used for tracking: **No.**
  On by default; Settings → Privacy turns it off.
- **Usage Data → Product Interaction** (Aptabase). Used for: Analytics. Linked to the user: **No.** Used for tracking: **No.**
  Opt-in only, and the question is only asked when the analytics key is set in the build.
- Nothing else: no location, purchases, health, contacts, photos (the profile photo stays on the phone) or browsing.
- Account deletion is in the app (Settings → Account → Delete account), as App Review requires; it also revokes Sign in
  with Apple.
- The EAS Update check and the course search carry no user data (see the policy).
- Tracking: No. The app shows no App Tracking Transparency prompt because it does not track.

## Age rating questionnaire (Apple's 2025 tiers: 4+, 9+, 13+, 16+, 18+)

Apple works the rating out from the answers. Everything is **None / No** (violence, sexual content, profanity, drugs,
alcohol, horror, medical, contests, unrestricted web access, user-generated content shared with others, messaging,
advertising) except possibly **Simulated Gambling**, which is the owner's decision:

- **Option A (recommended): Simulated Gambling: Infrequent.** The side games are named after golf bets and keep a
  points tally between friends, so declaring it avoids a back-and-forth in review. Result: **13+**, and **R18+ in
  Australia** (Australia rates any simulated gambling R18+).
- **Option B: Simulated Gambling: None.** Defensible: there is no casino-style game, no chance, no odds, no prizes and no
  money, only a scorecard and a points tally. Result: 4+. Risk: App Review may disagree because of the name and the
  game names, which costs a rejection and a resubmit.

Real gambling: **No** in either case.

## App Review notes

Paste into the review notes field:

> Birdies & Bets is a golf scorecard. Players enter their strokes per hole and the app keeps a traditional scorecard with handicaps. It also keeps the common golf side games (skins, Nassau, match play, Stableford, Wolf, Vegas, Bingo Bango Bongo, Hot Seat) as a tally of points between the players in a group.
>
> Points only (guideline 5.3): the app does not offer or facilitate real-money gambling. There is no payment processing, no in-app purchase, no deposits or withdrawals, no wallet, no prizes, and no links to payment or money-transfer services. The points are abstract; the results screen shows a tally and has no action to pay. The screens that set up and show points say "Points are a tally between players. Nothing is paid in the app."
>
> Sign-in is optional (guideline 5.1.1(v)): on first launch tap "Continue without an account" and everything works on the phone. Signing in with Apple or an emailed code adds sync between phones. Account deletion is in Settings → Account → Delete account.
>
> To try it: skip the intro → Play tab → Course → Sample course → Add players → type a name (add an index such as 8.2 to see handicap strokes) → Add player → Done → Add a game → Skins → Start round. Tap the number for par, or − and +, for each player, then Next hole. The trophy line opens the standings; Next on the last hole (or ⋯ → End round → Finish round) shows the results.

## Before submitting

- [ ] Apple Developer Program active
- [ ] `eas build --profile production --platform ios`
- [ ] `eas submit --platform ios`
- [ ] TestFlight round with real golfers on a real course
- [ ] Privacy and support URLs live and reachable, and the policy describes optional accounts (see the website repo)
- [ ] App Store Connect → App Privacy answers as above
- [ ] Age rating answered (Option A or B above)
- [ ] Sentry project: "Prevent Storing of IP Addresses" on, data scrubbing on, retention 90 days or less
- [ ] Screenshots uploaded in the order above
