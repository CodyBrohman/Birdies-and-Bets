# Birdies & Bets: design system (MASTER)

This file is the source of truth for how the app looks and reads. Code reads `src/theme/tokens.ts`; this file explains
the rules behind it.

**2026-10-14: evolve, de-template, go native.** The owner kept the cream/forest/pine palette and the chip logo, and asked
for an app that looks made by people rather than generated. The 2026-10-01 mockup patterns are retired: the eyebrow +
"Verb your noun." + tagline header, photo hero cards, icon tiles, arrow buttons, and Inter. Screens are being rebuilt
one at a time (TODO.md Phase 3); until a screen is rebuilt it may still show the old patterns, and the legacy type steps
exist only for those screens.

## The ten rules
1. **No eyebrow or tagline headers.** Tabs get a native large title that matches the tab name; pushed screens get a
   standard native title. No full stops in titles or buttons.
2. **Copy carries facts.** No greetings, compliments, time-of-day lines or adjectives about the golfer. An empty state
   says what will appear there and offers one action.
3. **No stock or generated photos.** A course is identified by its data (name, place, par, tees, your best). The contour
   lines (`ContourField`) appear only on sign-in and the share image.
4. **One dark surface:** the round-in-progress card. Everything else is cream ground with white grouped cells.
5. **Lists before cards:** iOS inset-grouped sections. Cards only for the live round, result callouts and the scorecard.
6. **Icons are SF Symbols** at two sizes, used only where they help scanning. No icon tiles. A chevron means "drill in";
   ↗ only for an external link; no arrows inside buttons.
7. **Colour carries meaning, never alone:** pine = primary action, under par, points up; gold = over par; coral =
   destructive or error; seat colours = which player, in a round. Always pair colour with a sign, shape or label.
8. **Uppercase only in scorecard table headers** (HOLE · PAR · SI · OUT · IN · TOT).
9. **One primary button per screen, at the bottom** where the thumb reaches.
10. **Native controls first:** Switch, segmented control, date and time pickers, Alert and ActionSheet, context menus,
    swipe actions, form sheets.

## Voice
The friend who keeps the card: plain, short and specific. Golf words are welcome (thru, up, net, skins, press). No
exclamation marks, puns, greetings or compliments. Titles are nouns; buttons are verb + noun ("Start round", "Save
round", "Add player").

**Glossary: one term per thing.**

| Thing | Term |
|---|---|
| A round being played | **Round in progress** |
| The round builder | **New round** (tab label: Play) |
| The hole-by-hole card | **Scorecard** |
| Game state | **Standings** during the round, **Results** after |
| The tally | **Points** |
| Game types | **Points game** / **Just for fun** |
| People | **Player** (in a round), **Friend** (saved), **Group** |
| Course data | **Course**, **Tees** |
| Handicap | **Handicap index (HCP)**, **Course handicap (CH)** |
| Halves | **Front 9 / Back 9** |
| Not holed out | **Picked up (PU)** |
| Scores to par | **E** for even; a true minus sign "−" |

- UI copy never says "settle up", "owes", "pays", "wager" or "bet" (the app's name is the exception).
- Say "Saved on this iPhone" only in local mode, and "Synced to your account" only when signed in.

## Colour (light only)

| Token | Value | Use |
|---|---|---|
| surface | #F5F4EC cream | the ground |
| surfaceRaised | #FFFEFA | grouped cells, cards (1pt `divider` #E6E6DC hairline) |
| surfaceRaised2 | #ECEEE5 | recessed wells (the stepper) |
| textPrimary | #17372D forest | text |
| textSecondary | #4F5751 | second level, about 6.8:1 on cream |
| textTertiary | #666E66 | the lightest text, about 4.8:1 on cream |
| accent / accentSoft / onAccent | #245C45 / #1D4D3A / #FFFFFF | primary buttons, selected controls, under-par marks |
| accentTint / accentTintText | #DCE8D6 / #1F4F3B | result callouts, quiet avatars |
| gold / goldText / goldTint | #A87A12 / #8A6514 / #F5E7C4 | over-par marks |
| destructive / negative | #B3412B coral | Delete buttons (white on coral), errors |
| hero / onHero / onHeroSoft | #17372D / #FFFFFF / 78% white | the round-in-progress card only |
| tickUpcoming | #B7BCAE | off-switch track, upcoming ticks |
| seat colours (`seatColors`) | slate #3E5C7A · plum #7A4A72 · teal #1F6A73 · clay #8A4A2E | players by seat in a round: scorecard column, standings, share image. Each has a tint and an on-tint text colour. |

Outside a round, avatars use one quiet tint (accentTint with forest initials): colour means a seat, nothing else.
`tokens.test.ts` checks every text and non-text pairing, blended rgba on the dark card, and the seat colours.

## Typography
The iOS system font (SF Pro) everywhere, from `Text step=…`. Weights come from the step; tabular figures on every
number step. Dynamic Type scales each step up to its cap; rows grow with it (no fixed heights around text).

| Step | Size/line | Weight | Use |
|---|---|---|---|
| largeTitle | 34/41 | bold | native large titles (the header draws it) |
| title1 | 28/34 | bold | the hole number on the live round |
| title2 | 22/28 | bold | |
| title3 | 20/25 | semibold | section headers in a screen |
| rowTitle | 17/22 | semibold | row titles, player names (iOS "headline") |
| rowBody | 17/22 | regular | body text (iOS "body") |
| callout | 16/21 | regular | |
| subhead | 15/20 | regular | row subtitles |
| footnote | 13/18 | regular | section footers, captions |
| caption1 / caption2 | 12/16 · 11/13 | regular | small print; 11pt is the floor |
| tableHeader | 12/16 | semibold, uppercase, +0.5 | scorecard headers only |
| scoreXL / scoreLg / scoreMd | 34 · 28 · 22 | semibold, tabular | the score being entered; stat numbers |
| cellMd | 17/22 | medium, tabular | scorecard cells |

Legacy steps (display, headline, title, body 15, eyebrow…) remain only for screens not yet rebuilt and are removed
once none use them. Never set a numeric `fontSize` in a screen.

## Shape, space, motion
- **Radius:** grouped cells and cards 12–14 (iOS-like); the round-in-progress card 22; pills 999 (filters only).
- **Space:** a 4pt grid. Gutter 20 (32 from 600pt wide). Sections separate with space and a header, not boxes.
- **Touch targets:** 44pt minimum (48 preferred); the score buttons 56pt with 16pt between them.
- **Pressed state:** one opacity (`PRESSED_OPACITY` 0.6) through `ui/Pressable`; never a layout-shifting transform.
- **Motion with meaning:** the score number ticks when it changes; Next scrolls to the top with a short cross-fade;
  standings reorder in place. Everything is off under Reduce Motion.
- **Haptics:** selection on segmented controls and chips; light impact on the score buttons and Next; success on
  Save round; warning before a destructive confirm. All follow the Haptics setting.

## Icons
SF Symbols (`expo-symbols`) through `ui/Icon`, which falls back to Ionicons on web and in tests. Two sizes (20, 24).
Decorative icons are hidden from VoiceOver. Tabs: house, map, figure.golf, person.2, person.crop.circle (filled when
selected).

## Screen anatomy (2026-10-14 target)
- **Tabs:** Home · Courses · Play · Friends · Profile (native tab bar; Liquid Glass on iOS 26). A round in progress
  shows on every tab: the tab bar's bottom accessory on iOS 26, a slim banner on older iOS.
- **Live round:** native header "Hole 7" with par, yards and SI under it; hole chips; a one-line standings strip;
  per player a big −/+ with the score between (from no score: tap = par, − = birdie, + = bogey); game prompts inline
  only on holes that have them; the full scorecard below the fold; Previous / Next pinned at the bottom.
- **Standings:** a form sheet; each game opens with a headline sentence ("Jay 2 up thru 7").
- **Results:** headline result; Player | Gross | Net | Pts with CH as a caption; Games, Points, Notes; one primary
  "Save round".
- **Play (New round):** one grouped form (Course, Tees, Holes, Date and tee time, Players, Games, Round options) and
  one pinned "Start round".
- **Home:** the wordmark; the round in progress, the next round, or "New round"; a season stats row; recent rounds.
- **Courses:** native search; "Recently played" and "Saved" rows built from data; a course detail screen.
- **Friends:** groups and friends lists; each friend's head to head; "Play with …".
- **Profile:** a header row; Handicap index and Home course; Account; Settings and help links.

## Components
- **Button:** primary (pine), secondary, plain, destructive (coral on any variant). No leading arrows.
- **ListSection / ListItem:** inset-grouped rows: title, subtitle, value, chevron / switch / check accessory, destructive
  style, `accessibilityState`, swipe actions and a context menu. Interactive pieces are siblings, never nested.
- **LiveRoundCard:** the one dark card. **CourseRow**, **ResultCallout**, **Avatar** (seat colour in a round).
- **Confirmations:** `confirm()` / `ask()` (native Alert, destructive style; browser confirm on web).
- **Score cell:** the birdie ring is pine, the bogey square gold, a pick-up "PU"; stroke dots in the corner.

## Pre-delivery checklist (from UI/UX Pro Max `pro-rules.md`, adapted)
- [ ] No eyebrow/tagline header, no full-stop titles, no filler copy; glossary terms only
- [ ] Touch targets ≥ 44pt (48 preferred), 8pt+ apart; pressed feedback on every tappable
- [ ] Text ≥ 4.5:1, non-text ≥ 3:1 (tokens test); colour never the only signal
- [ ] Decorative icons hidden from VoiceOver; icon buttons named; headers have the header role; focus order matches
- [ ] Largest Dynamic Type: nothing clipped or overlapping; rows grow
- [ ] Reduce Motion: nothing slides or bounces
- [ ] Safe areas respected; nothing hidden behind the tab bar, accessory or a pinned button
- [ ] 320pt and 430pt widths
- [ ] Semantic tokens only; no hex and no numeric font sizes in screens
- [ ] Destructive actions confirm natively, in coral
