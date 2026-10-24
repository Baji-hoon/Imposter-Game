# Imposter — Design System (Neo-Brutalist)

Save as `docs/DESIGN.md`. This is the single source of truth for how every screen looks, on **native (Android) and web (iPhone Safari)**.
Visual references: the user's Home mockup (serif wordmark, icon-tile buttons) and the Dribbble "Taxi Rider" neo-brutalist reference
(cream canvas, thick black strokes, yellow + orange accents, hard offset shadows, dot-grid and hazard-stripe details).

**This is a restyle only.** Do not change game logic, protocol, engine, transport or navigation. Same screens, same behavior, new look.

---

## 0. Decisions already made / flags

1. **One theme only: Light/Cream.** Remove the Sun/Night toggle. Neo-brutalism is strongest on cream and cream is the best outdoors.
2. **Mascot must be original.** The yellow crewmate with a leaf sprout in the home mockup is a character from another game (Among Us).
   Do not ship it in a published app. Build a `<Mascot />` component with a placeholder (see section 6.1) and swap in an original character later.
3. **Display font:** the home mockup uses a heavy high-contrast serif (looks like *Abril Fatface*; confirm what was used). Use it for the wordmark,
   screen titles, the room code, and the secret word. Use a clean grotesque (*Archivo*) for everything small. Never set small text in the serif.
4. **Colors below were sampled from the reference images**, so treat hex values as very close, not pixel-exact. Confirm with an eyedropper in the design file
   and change only `tokens.ts`.
5. **Two status colors are additions** to the reference palette (red, green) because a game needs "eliminated" and "present". Use sparingly.

---

## 1. Design tokens (`packages/shared/src/theme.ts`, replaces Sun/Night tokens)

### Colors
| Token | Hex | Use |
|---|---|---|
| `ink` | `#111111` | All strokes, shadows, body text |
| `cream` | `#F4F1EA` | Screen background |
| `paper` | `#FFFFFF` | Cards, inputs, buttons (default fill) |
| `orange` | `#FF5A00` | Primary action, host badge, accent square |
| `yellow` | `#FFB800` | Secondary action, selection, highlights, marker strips |
| `yellowSoft` | `#F9DA81` | Large soft fills (hero blocks) |
| `red` | `#E5322D` | Eliminated, imposter reveal, error (addition) |
| `green` | `#1F9D55` | Present/connected dot (addition) |
| `grey` | `#8A8780` | Disabled text/strokes only |

Rules:
- **Text on orange, yellow and cream is always `ink`.** White on orange fails contrast (3.1:1).
- **Orange is a fill, never small text on cream** (2.8:1). Use `ink` text with an orange tile or underline instead.
- Allowed text pairs: ink/cream 16.7, ink/paper 18.9, ink/yellow 10.9, ink/orange 6.0, ink/green 5.4. White on red only for large text (4.4).
- **Forbidden:** blue, purple, gradients, blurred shadows, glassmorphism, rounded pill shapes, dark backgrounds.

### Shape
| Token | Value |
|---|---|
| `stroke` | **3** (thin dividers/secondary: 2) |
| `radius` | **0** everywhere (only exception: the OS phone frame). Avatar tiles also square. |
| `shadow` | hard offset **4 right, 4 down**, solid `ink`, no blur. Large cards: 6. |
| `space` | 4, 8, 12, 16, 20, 24, 32 (screen padding 20) |
| `tap` | minimum 56 tall for any tappable control |

### Typography
| Style | Font | Size/line | Notes |
|---|---|---|---|
| `wordmark` | Display serif | 56/58 | uppercase, tight |
| `h1` | Display serif | 36/40 | screen titles |
| `h2` | Display serif | 28/32 | section titles |
| `codeBig` | Display serif | 72/72 | room code, letter spacing 8 |
| `word` | Display serif | 56 to 72, auto-shrink to fit one line | the secret word |
| `title` | Archivo 800 | 20/24 | card titles, buttons |
| `body` | Archivo 500 | 16/22 | |
| `label` | Archivo 700 | 12/16 | UPPERCASE, letter spacing 1, small captions |

Fonts: `@expo-google-fonts/abril-fatface` (swap the family name in one place if the mockup used a different serif) and `@expo-google-fonts/archivo`.
Load with `useFonts`, hold the splash screen until ready, and on web preload them to avoid a flash. System font fallback must be set.

### Motion
- **Press:** the element translates by the shadow offset (4,4) and the shadow collapses to 0. Duration 80 ms. This is the signature interaction.
- Card flip, reveal slide-ins: 200 to 300 ms ease-out. Respect reduce-motion (replace with fades).
- No bouncing, no springs, no looping animations except the Reconnecting stripe (static if reduce-motion).

---

## 2. Cross-platform implementation rules (avoid the common mistakes)

- **Do not use `shadowColor/shadowRadius/elevation`.** Android cannot draw a hard, blur-free offset shadow with them.
  Build the shadow as a real `View`: an absolutely positioned `ink` rectangle behind the element, offset by (4,4).
  This works identically on Android and `react-native-web`.
- Build everything from a small set of primitives in `apps/mobile/src/ui/` and forbid raw styled `View`s in screens:
  `BrutalBox`, `BrutalButton`, `BrutalCard`, `BrutalInput`, `Chip`, `SegmentedTabs`, `Sheet`, `AvatarTile`, `RoundMeter`, `StatusDot`,
  `Banner`, `Toast`, `Stripe` (hazard), `DotGrid`, `CheckerStrip`, `AccentSquare`, `Mascot`.
- Decorative patterns (`DotGrid`, `Stripe`, `CheckerStrip`) are `react-native-svg` patterns, static, and never block touches (`pointerEvents="none"`).
- Icons: `@expo/vector-icons` FontAwesome5 **solid** (the home mockup's rocket and hiker are exactly `rocket` and `hiking`). Size 24, color `ink`.
  No emoji in UI chrome (buttons, headers, tabs). Emoji stay only as player avatars for now.
- Safe areas and `100dvh` on web. Every screen scrolls if content overflows; primary buttons are sticky at the bottom.
- Text must never truncate in the middle of a sentence (the lobby warning is cut off today). Wrap to two lines, or shorten the copy.

---

## 3. Components

**BrutalBox** — base: `paper` fill, 3 stroke `ink`, 0 radius, optional hard shadow, `pressable` prop adds the press animation.

**BrutalButton**
- `primary`: fill `orange`, `ink` label, label style `title` uppercase.
- `secondary`: fill `yellow`.
- `neutral`: fill `paper`.
- `tile` (home screen style): a `paper` box with a square **icon tile** (orange or yellow, 56x56, stroke right edge) on the left and uppercase label.
- Right-side **arrow block** variant for forward actions (black square with a cream arrow), like the reference "SIGN IN" button.
- Disabled: `cream` fill, **dashed** 3 stroke in `grey`, `grey` label, no shadow, no press animation. Label says what is missing ("NEED 1 MORE PLAYER").

**BrutalInput** — `paper`, 3 stroke, label above in `label` style, focus = stroke stays ink and a 4pt `yellow` bar appears under the field.

**Chip / segmented option** — unselected: `paper`, 3 stroke. Selected: `orange` fill with hard shadow. Used in Settings and tabs.

**SegmentedTabs** (e.g. iPhone Safari / Native App): two joined boxes, selected = `ink` fill with `cream` label, unselected = `paper`.

**Sheet** (bottom sheet): `cream`, 3 stroke on top and sides, grab bar as a 4pt `ink` bar, scrim `ink` at 50 percent.

**AvatarTile** — square `paper` tile, 3 stroke, emoji centered, name below in `label`. Selected: `yellow` fill, hard shadow, small `ink` tag ("VOTE", "YOU", "HOST").
Disabled/self: hatch pattern fill (diagonal 2pt lines), label "YOU".

**RoundMeter** — row of N small square segments, filled = `ink`, current = `orange`, with "ROUND 2 OF 5" in `label` style. No percentages.

**StatusDot** — square 10x10 (not round): `green` present, `yellow` with diagonal stripe = reconnecting/away, `red` = offline.
Connection pill shows just the dot; milliseconds only on long-press (debug).

**Banner** — marker strip: `yellow` fill behind a single line of `title` text, slight angle 0 (no rotation). Used for "ONE-WORD ROUND".

**Reconnecting pill** — `yellow` with moving hazard stripe, text "RECONNECTING...", never blocks touches.

**Decor** (use sparingly, max two per screen):
- `AccentSquare`: 24x24 `orange` square, top-right on hero screens.
- `DotGrid`: 6x6 halftone dots in `ink` at 100 percent in a 56x56 corner block.
- `CheckerStrip`: black/white 8pt squares, 16pt tall, under tagline badges.
- `HazardStripe`: diagonal ink/cream stripes, 20pt tall, bottom of Home and blank-card frame.

---

## 4. Screen-by-screen

### S1 Home (matches the user's mockup)
- Cream canvas, `AccentSquare` top-right. Wordmark `IMPOSTER` (display serif 56, left aligned) with the tagline `Judge quick` below in `h2`.
- Center: `<Mascot />` (placeholder for now).
- Two `tile` buttons: **HOST ROOM** (orange icon tile, FA5 `rocket`) and **JOIN ROOM** (yellow icon tile, FA5 `hiking`). Hard shadows.
- Small player chip (avatar + name) top-left as a `neutral` mini button opening the profile sheet.
- Remove: Sun/Night toggle, "Raw LAN Ping/Pong Spike" footer. Put the app version in tiny `label` text at the bottom.

### S2 Profile sheet
- `Sheet` with title `h2` "YOUR PROFILE", `BrutalInput` for the name, 5-column grid of `AvatarTile`s (selected = yellow + shadow), `primary` button "SAVE".

### S4 Join
- Back = square `neutral` icon button. Title `h1` "JOIN GAME".
- "Scan or paste link" card (yellow top strip with label). Four square code boxes with display serif letters. Host IP `BrutalInput` (empty by default; autofilled from a scanned link).
- "Scan for rooms" is a text link in `ink`, underlined with a 3pt `yellow` bar. Connect = `primary`, disabled until valid.

### S3 Host lobby
- Top bar: `Exit` (neutral) left, `Settings` (secondary) right.
- Label "ROOM CODE" then `codeBig` on a `yellow` marker strip. Chip with "HOST IP" and the IP.
- `SegmentedTabs` iPhone Safari | Native App, then the QR in a `paper` `BrutalCard` with 6 shadow and a one-line caption.
- "PLAYERS (2/10)" label, rows: `AvatarTile` mini, name, `HOST` tag (orange), `StatusDot`, `Manage` ghost button.
- Sticky bottom: Start = `primary` when allowed, otherwise disabled with exact reason ("NEED 1 MORE PLAYER", "WAITING FOR RIYA TO RECONNECT").
  The minimum-player hint is its own full-width line above the button, never beside the "Players" label.

### S5 Settings sheet
- Section labels in `label` style, options as selected-orange `Chip` rows, dividers 2 stroke. Apply = `primary`, sticky.

### S6 Card (core)
- Top: `RoundMeter` and the connection `StatusDot`.
- Hidden: a tall `BrutalCard` (6 shadow) with `DotGrid` background, label "SECRET CARD", the `Mascot` mark, and "TAP TO REVEAL".
- Revealed: card fill `yellowSoft`, tag "YOUR SECRET WORD" (orange chip), the word in `word` style, one-line hint below. Small "DOUBLE-TAP TO PEEK" label under the card.
- Blank imposter: card with `HazardStripe` border, `???` in `word` style, copy "NO WORD. BLUFF."
- One-word round: `Banner` under the meter.
- Instruction card at the bottom is limited to two lines; the rest goes behind an "i" `Chip` that opens a sheet.
- Host-only `Open Vote` = `primary`, sticky.

### S7 Vote
- `h1` "WHO'S THE IMPOSTER?" and one line of body copy. 2-column grid of `AvatarTile`s (3 columns at 7+ players). Self tile hatched.
- Selected tile: yellow fill, shadow, "VOTE" tag. Confirm = `primary`, disabled text "PICK A PLAYER". After confirming: "WAITING... 6/10 VOTED".

### S8 Result
- Hero outcome `BrutalCard` colored by outcome: points gained = `yellow`, wrong or neutral = `paper`, eliminated/busted = `red` with large `ink` or `paper` text.
  Big display line ("SPOT ON! +1"), one body sentence.
- Roles card: IMPOSTER chips with `red` stroke, CIVILIAN chips neutral.
- Secret words card: two columns split by a 3pt line, both words in `h2`.
- Vote tallies: chunky horizontal bars (stroke 3, fill `yellow`, eliminated = `red`) with count tags.
- Sticky `primary` "VIEW SCORES".

### S9 Leaderboard
- Rows: square rank tile (1st = yellow with crown icon), `AvatarTile` mini, name, points in display serif, delta chip "+1". Own row has an `orange` stroke and 6 shadow.
- Sticky "NEXT ROUND" (host) or "WAITING FOR HOST" (others, disabled style).

### S10 Game over
- Podium made of three stacked `ink`-stroked blocks (heights 3:2:1) with avatars on top. Awards as a horizontal row of `BrutalCard`s. "PLAY AGAIN" primary, "CHANGE SETTINGS" neutral, "LEAVE" text link.

---

## 5. Copy and voice
Short, loud, uppercase for buttons and labels, sentence case for body. No emoji in button labels. Replace technical wording
(Ping, ms, socket, transport, spike) with player language ("RECONNECTING...").

---

## 6. Appendix

### 6.1 Mascot placeholder
Until an original character exists, `Mascot` renders a simple card-shaped figure: a rotated `paper` rectangle with 3 stroke, two square eyes and a masked bar across them,
filled with `yellow`, plus hard shadow. It is one SVG file so it can be swapped in one place.

### 6.2 Quick QA checklist per screen
- Only palette colors; no blue, gradients or blur anywhere.
- Every box has a 3 stroke and square corners; every pressable has a hard shadow and the press animation.
- No text under 12pt, no truncated sentences, minimum 56 tall tap targets.
- Orange never used as small text on cream; no white text on orange or yellow.
- Looks the same on Android and iPhone Safari (compare screenshots).
- Reduce-motion respected.

### 6.3 Out of scope for this restyle
New features, logic changes, the custom avatar illustration set (later), and sound.
