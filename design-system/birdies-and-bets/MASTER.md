# Birdies & Bets: design system (MASTER)

This file is the source of truth for how the app looks. Code reads `src/theme/tokens.ts`, and this file explains the choices behind it. Page-specific overrides would live in `pages/` (there are none yet).

**2026-10-01 redesign.** The app now matches the ten reference mockups the owner supplied: cream ground, warm white cards, deep forest ink, pine buttons, dark forest hero cards and a gold HCP badge, with Inter everywhere and light mode only. It keeps the logo: the chip mark (`assets/logo.png`) inside the app, on the website and on socials; the rounded-square version (`assets/app-logo.png`) is the app icon. This replaces the 2026-09-28 green-black/Playfair brand and its dark mode.

## Voice
Warm and quiet: a country-club scorecard, not a sportsbook. Each tab opens the same way: a green uppercase eyebrow, a big bold title ending in a full stop ("Find your fairway."), and one grey line under it. Photos carry the mood; cards stay plain.

## Colour (light only)
Semantic rule: **pine = primary, selected, good, under par. Gold = attention, over par, the HCP badge. Coral = errors only.** Bogeys are gold, never red.

| Token | Value | Use |
|---|---|---|
| surface | #F5F4EC cream | ground and tab bar |
| surfaceRaised | #FFFEFA | cards (with a 1pt `divider` #E6E6DC hairline) |
| surfaceRaised2 | #ECEEE5 | recessed tiles inside cards |
| textPrimary / Secondary / Tertiary | #17372D / #5E665F / #666E66 | forest ink; all ≥ 4.5:1 on cream and card |
| accent / accentSoft / onAccent | #245C45 / #1D4D3A / #FFFFFF | buttons, selected pills, markers |
| accentText | #245C45 | eyebrows, links ("See friends") |
| accentTint / accentTintText | #DCE8D6 / #1F4F3B | tinted cards, icon tiles, note bar, "FOR FUN" |
| hero / heroRaised / onHero / onHeroSoft | #17372D / #245C45 / #FFF / 72% white | dark round card, profile card, sticky bar |
| goldFill | #E7BD5A | HCP badge, the selected-course check, "coming up" dot (forest text on it) |
| gold / goldText / goldTint | #A87A12 / #8A6514 / #F5E7C4 | over-par markers, "WAGER" badge |
| neutralChip / Text | #E8EBE2 / #3E4A43 | time chips, stepper buttons, the "+" on Friends, tinted buttons |
| star | #A8662B | rating star |
| negative | #B3412B | validation, destructive |
| avatarA–D | sage #DCE8D6, sand #F0DDB3, slate #DCE1EA, rose #EFD9D6 | two initials in forest |

`color.dark` is an alias of `color.light`, so scheme-keyed code still compiles. `src/theme/tokens.test.ts` checks contrast for every pairing the kit produces, including white on hero and forest on goldFill.

## Typography
- **Inter** only, measured from the mockups. Steps (pt/line):
  - display 32/36 Bold −0.9 (screen titles)
  - headline 21/26 Bold (section titles)
  - title 16/21 Bold (card and row titles)
  - button 16/22 Bold
  - score 26/30
  - body 15/21 (subtitles)
  - label 14/19 SemiBold (pills, links)
  - caption 13/17 Medium (meta)
  - eyebrow 11/14 Bold, uppercase, +1.4 tracking
  - overline 11/14 Bold, uppercase, +0.8 (badges)
  - tab 11/14
  - displayXl 40/44 (the hole title)
- The floor is 11pt, used only for eyebrows, badges and tab labels. Each step has a Dynamic Type cap.
- Playfair and JetBrains Mono stay registered for the share card only.

## Shape, space, motion
- **Radius:**
  - 20 for cards
  - 22 for hero and photo cards
  - 16 for large buttons, 12 for smaller ones
  - 14 for icon tiles and inner tiles
  - 10 for time chips and stepper buttons
  - pill for filter pills and avatars
  - 24 for the sheet top
- **Space:** gutter 20. `layout` gives card padding 16, 14 between cards and 28 before a new section.
- **Elevation:** cards have a hairline plus `0 1px 2px rgba(23,55,45,.04)`. Pressed or hovered cards lift to `0 4px 14px …/.08`. The sticky bar floats with a soft dark shadow.
- **Touch targets:** 48pt minimum. Pills are 40pt with hitSlop, primary buttons 56pt.
- **States** (`components/ui/interaction.ts`):
  - pressed: a deeper fill, or 0.85–0.92 opacity
  - hover (web): a tint or the lifted shadow
  - focus: a pine ring on `:focus-visible`
  - disabled: 40%
- **Motion:** colour and opacity only. Reduce Motion collapses it.

## Icons
Ionicons outline throughout. The tab bar uses home, map, flag, people and person outlines. Arrows (`arrow-forward`, and `arrow-up` rotated 45°) mark navigation. Decorative icons are hidden from VoiceOver.

## Screen anatomy (the mockups)
- **Tabs:** Home · Courses · Bet · Friends · Profile. The bar is cream with a hairline top and outline icons; the active tab is forest with a bold label.
- **Home:**
  - logo chip + "birdies & bets" wordmark + avatar
  - eyebrow, "Hey, {first}."
  - photo `HeroCard` (pill, title, CTA)
  - Handicap and Your circle tiles
  - "A few familiar faces"
  - sage "Find your next fairway"
  - recent rounds
- **Courses:** header, "Browsing near" sage card, search, filter pills, `PhotoCard`s (tag, check, name, facts, arrow disc), "Add your course", and a `StickyBar` when a round is set up or live.
- **Bet (round builder):**
  - dark round card: course, meta, day / time / tees, Start, change course
  - Tee time: day pills, plus time chips in a card
  - Bring your crew: one card per person, with ⊕ / ✓
  - Add a side game: All / Wagers / For fun pills; rows with an icon tile, title, badge, blurb, stake line and player range
  - Round add-ons card: holes, settings and the no-payments line
- **Friends:** dark "Build your golf circle" CTA, Rounds in your circle (live, coming up, played with Rematch), Your golf friends (one card, divided rows, tinted "+"), Your groups, and the sage "Plan a round" card.
- **Profile:** dark golfer card (photo or initials, gold camera badge, name, area, gold HCP badge), name / index stepper / home area card, Clubs in your bag pills, note bar, and More (index history, settings, tour).

## Components (recipes)
- **Button:**
  - `primary` is pine with a white label
  - `hero` is pine on a dark card
  - `tinted` is chip grey with a pine label
  - `secondary` is a white card with a hairline and a pine label
  - a leading arrow on forward actions
- **Card:** raised · tinted (sage) · gold · accent (selected) · hero (dark forest). `onPress` makes the whole card a button.
- **Chip:** white pill with a hairline and a pine label; selected is a pine fill. `shape="time"` is the recessed time chip.
- **ListRow:**
  - leading art, title, accent and meta lines
  - `trailing` glyph inside the press area
  - `action` control and `footer` links outside it (never nest buttons)
- **HeroCard / PhotoCard / StickyBar:** see `components/ui/HeroCard.tsx`. Photos are the brand set in `assets/photos`, picked per course by `components/courseArt.ts`.
- **ScreenHeader, SectionLabel** (21pt title with an optional link and sub line), **IconTile, NoteBar, Avatar / AvatarStack, Stepper** (− value +, optional typed centre).
- **Score cell:** the birdie/eagle ring is pine, the bogey square gold.

## Pre-delivery checklist
- [ ] Matches the reference mockups side by side (spacing, colour, type, radius)
- [ ] Touch targets ≥ 48pt; hitSlop on pills and small glyphs
- [ ] Text ≥ 4.5:1, non-text ≥ 3:1 (tokens test)
- [ ] No nested buttons on web (ListRow `action` / `footer`)
- [ ] Safe areas respected; the sticky bar doesn't cover the last card
- [ ] 375pt width, largest Dynamic Type, Reduce Motion
- [ ] Semantic tokens only; no per-screen hex
