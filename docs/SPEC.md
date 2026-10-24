# Imposter — Party Game Build Spec

A social, phone-as-secret-card word game for 3–10 friends. Built with **Expo (React Native + TypeScript)**. Designed to be built with **Google Antigravity**.

> How to use this file: save it as `docs/SPEC.md` in your repo. Do **not** paste it whole into an Antigravity rule file (rule files have a size cap). Instead, add a short Always-On rule that says "Read `docs/SPEC.md` before any task and follow it," then drive the build with the phase prompts in section 15.

---

## 1. Product vision

- Everyone sits in a circle (beach, rooftop, train, living room). **No TV, no main screen.**
- The phone is only a **secret word card** and a **voting pad**. Everything else is spoken out loud.
- Honor system: no timers, no buzzing phones, no turn indicators. The group decides who starts and which way the circle moves.
- No typing anywhere. Names/avatars are picked or auto-generated.

### Design principles
1. **Eyes up.** The phone comes out only to peek at your word and to vote.
2. **One primary action per screen.**
3. **Works outdoors:** high contrast, big type, no reliance on sound.
4. **Fast rematch.** Play-again is always one tap.
5. **Never leak secrets.** A glance from a neighbor must reveal nothing.

---

## 2. Game rules (final)

### 2.1 Setup
- Players: **3–10**.
- Imposters: **1** by default. **2** allowed when players ≥ 8 (host toggle, default on at ≥ 8).
- Each round, all civilians get **word A**; imposter(s) get **word B** (a similar but different word), e.g. `egg` / `ball`.
- **Imposter does not know they are the imposter** (they just see a different word) except in Blank mode.

### 2.2 Round modifiers (host settings, each: Off / Sometimes / Every round)
| Modifier | Effect |
|---|---|
| **Blank imposter** | Imposter's card shows an empty card (no word). They know their role and must bluff. |
| **One-word round** | Banner on every phone: "Clues must be ONE word." Spoken honor-system rule, not enforced by the app. |

"Sometimes" = 25% chance per round (constant `MODIFIER_SOMETIMES_P = 0.25`).

### 2.3 Round flow (state machine)
```
LOBBY → DEALING → TALKING → VOTING → REVEAL → SCORES → (next round → DEALING | GAME_OVER)
```
- **DEALING:** host taps Deal; each phone receives only its own card.
- **TALKING:** fully offline-from-the-app. Group goes around out loud. No timer. Players may re-peek their word any time.
- **VOTING:** host taps "Open Vote" when the group agrees. Everyone votes on their phone.
- **REVEAL:** tallies appear together after all votes are in; removed player and roles are revealed with both words side by side.
- **SCORES:** points animate onto the leaderboard, round meter advances.

### 2.4 Voting
- Every player (excluding removed/ghost players) votes for **any other player**. No self-vote.
- Votes are **hidden until everyone has submitted**, then revealed together (prevents bandwagoning).
- The player with the **most votes is removed**.
- **Tie for most votes → nobody is removed** and that vote counts as "imposter survived."
- Votes per round = **number of imposters** (1 or 2).
  - After a removal, the removed player becomes a **ghost**: stays in the circle, stays quiet, cannot vote again this round.
  - If all imposters are removed, the round ends early.
  - If a civilian is removed and imposters remain, another vote begins among the remaining players.

### 2.5 Scoring (constants in `packages/shared/src/scoring.ts`)
| Event | Points |
|---|---|
| Imposter survives all votes | **+5** (blank imposter: **+7**) — each imposter scored separately |
| Voter voted for an imposter who was removed | **+1** each (only voters who picked that imposter) |
| Wrong votes / removed civilian | 0 |

No imposter last-chance guess (removed to avoid typing).

### 2.6 Game end
- Host picks length: 5 / 8 / 10 rounds or Endless.
- Final screen: podium, awards (Best Liar, Sharpest Detective, Most Suspicious, Got Caught Every Time), **Play again** (same players) and **Change settings**.

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| App | Expo (latest stable SDK), TypeScript, `expo-router` |
| State | Zustand |
| Animation | `react-native-reanimated` |
| QR show | `react-native-qrcode-svg` |
| QR scan | `expo-camera` (`CameraView` barcode scanning) |
| Device IP | `expo-network` |
| Persist player id | `expo-secure-store` |
| Keep screen awake | `expo-keep-awake` |
| Hide word from screenshots | `expo-screen-capture` (`usePreventScreenCapture` on the word card) |
| LAN TCP (phone-hosted mode) | `react-native-tcp-socket` (requires a dev build, **not Expo Go**) |
| Shared logic | `packages/shared` (protocol types, game engine, scoring, word packs) |
| Tests | Vitest for engine/protocol; Maestro or Detox for a smoke flow |

### Monorepo layout
```
imposter/
├─ apps/
│  └─ mobile/            # Expo app
├─ packages/
│  └─ shared/            # engine, protocol, scoring, word packs (pure TS, no RN imports)
├─ docs/SPEC.md          # this file
└─ AGENTS.md / .agents/rules/   # short pointer rules for Antigravity
```

**Rule:** the game engine in `packages/shared` is a **pure, deterministic TypeScript reducer** (`(state, action) → {state, effects}`) with no network or UI imports. It runs inside the host phone. Everything else is transport and UI.

---

## 4. Connectivity architecture

Phone-hosted LAN mode: the host phone runs the game engine and TCP server over local Wi-Fi or a phone hotspot.

### 4.1 Transport abstraction
```ts
interface Transport {
  connect(target: ConnectTarget): Promise<void>;
  send(msg: ClientMsg): void;
  onMessage(cb: (msg: ServerMsg) => void): void;
  onStatus(cb: (s: 'connecting'|'open'|'reconnecting'|'closed') => void): void;
  close(): void;
}
```
- `TcpTransport` (TCP, newline-delimited JSON).

UI code only talks to `Transport` + the Zustand store. Adding/removing a mode must not touch screens.

### 4.2 Phone-hosted LAN
- The host phone runs the shared engine and a TCP server (`react-native-tcp-socket`), default port `47777`.
- Joiners connect to `ip:port`. **Discovery = QR code** containing `imposter://join?h=<ip>&p=47777&c=<roomCode>`; fallback: manual IP entry. (mDNS/Bonjour can be added later; do not depend on it.)
- Get the host IP with `expo-network` (`getIpAddressAsync`). **Never hardcode hotspot IPs** (iOS/Android hotspot ranges vary).
- The host's UI shows only the host's own card; the engine's full state is never rendered.
- Framing: **NDJSON** — one JSON message per line, `\n` terminated. Buffer partial chunks until a newline arrives.
- Platform notes:
  - iOS: add `NSLocalNetworkUsageDescription` (and Bonjour services if mDNS is added later) in `app.json` → `ios.infoPlist`.
  - Android: request nothing special for raw TCP; keep the screen awake on the host.
  - Requires `expo-dev-client` / `expo prebuild`. **Expo Go cannot run Mode B.**
- Validate `react-native-tcp-socket` against the installed Expo SDK / New Architecture before committing; if it fails, Mode B stays behind a feature flag.

### 4.3 Ping / pong heartbeat

Purpose: detect dead connections quickly on flaky beach/rooftop networks, show live status, and resume seamlessly.

**Client → host**
```json
{ "v":1, "t":"ping", "id":"p-183", "ts":1735000000000 }
```
**Host → client**
```json
{ "v":1, "t":"pong", "id":"p-183", "ts":1735000000000 }
```

| Parameter | Value |
|---|---|
| Client sends `ping` every | **5 s** |
| Client declares link lost if no `pong`/any message for | **12 s** (≈2 misses) |
| Host marks player **Away** if silent for | **15 s** |
| Host removes an Away player after | **10 min** (can be kicked earlier by host) |
| RTT | `now - ts` on pong; display as a small signal dot (green < 150 ms, amber < 500 ms, red otherwise) |

Rules:
- **Any inbound message counts as liveness**, not only pongs.
- App-level ping/pong is used for heartbeat detection because React Native cannot send raw protocol frames and TCP sockets have no native ping frames.
- Pause pinging when the app is backgrounded; on foreground, send `hello` immediately.

**Reconnect (client)**
- Exponential backoff with jitter: 0.5 s → 1 → 2 → 4 → 5 s (cap), forever until the user leaves the room.
- On reconnect send:
```json
{ "v":1, "t":"hello", "room":"KQZB", "playerId":"<uuid>", "resume":"<token>" }
```
- Host validates `playerId + resume`, marks the player Present, and replies with `state_sync` (that player's **private view**: own word/role card state, phase, scores, vote status). Own word is delivered again on resume so a rejoining player still has their card.
- UI shows a small "Reconnecting…" pill (top of screen), never a blocking modal.

**Reliability**
- Every server broadcast carries `seq` (monotonic per room). If a client sees a gap, it sends `resync` and gets a fresh `state_sync`.
- Commands from clients carry `cmdId`; host ignores duplicates (idempotent — e.g., double-submitted votes).

---

## 5. Protocol (v1)

All messages: `{ v: 1, t: <type>, ... }`. Define with `zod` schemas in `packages/shared/src/protocol.ts` and infer TS types.

### Client → host
| `t` | Payload | Notes |
|---|---|---|
| `hello` | `room, playerId?, resume?, name, avatar` | Join or resume |
| `ping` | `id, ts` | Heartbeat |
| `submit_vote` | `cmdId, voteIndex, targetId` | One per vote round |
| `resync` | — | Ask for full private state |
| `leave` | — | Graceful exit |
| **Host-only** | | Validated server-side by `hostId` |
| `set_settings` | `settings` | Lobby only |
| `start_game` | — | ≥ 3 players |
| `deal` | — | Start a round |
| `open_vote` | — | TALKING → VOTING |
| `next_round` | — | After SCORES |
| `kick` | `playerId` | — |
| `transfer_host` | `playerId` | — |
| `play_again` | — | After GAME_OVER |

### Host → client
| `t` | Payload |
|---|---|
| `welcome` | `playerId, resume, hostId, room` |
| `pong` | `id, ts` |
| `state_sync` | private view (see below) |
| `lobby` | `players[], settings` |
| `card` | `roundId, word: string \| null, modifiers` (private, per player) |
| `phase` | `phase, round, totalRounds` |
| `vote_open` | `voteIndex, eligibleTargets[]` |
| `vote_progress` | `submitted, total` (no identities) |
| `vote_result` | `tallies, removedId \| null, roles, words{civilian,imposter}, scoreDelta` |
| `scores` | `scores{playerId: number}` |
| `game_over` | `finalScores, awards[]` |
| `error` | `code, message` |

**Privacy rule:** a client never receives another player's word or role until `vote_result`. Test this explicitly.

### Private view (`state_sync`)
```ts
{
  seq, room, hostId, phase, round, totalRounds,
  players: { id, name, avatar, present, ghost }[],
  me: { id, word: string | null, hasWord: boolean, voted: boolean[] },
  settings, scores, modifiers
}
```

---

## 6. Data models

```ts
type Phase = 'LOBBY'|'DEALING'|'TALKING'|'VOTING'|'REVEAL'|'SCORES'|'GAME_OVER';

interface Player { id: string; name: string; avatar: string; present: boolean; ghost: boolean; score: number; }

interface Settings {
  rounds: 5 | 8 | 10 | 0;              // 0 = endless
  imposterCount: 1 | 2;                // 2 only if players >= 8
  blankImposter: 'off'|'sometimes'|'every';
  oneWordRound: 'off'|'sometimes'|'every';
  packs: string[];                     // enabled pack ids
  difficulty: 'easy'|'medium'|'hard'|'mixed';
}

interface RoundSecret {                // server/host only
  roundId: string;
  civilianWord: string;
  imposterWord: string | null;         // null when blank
  imposterIds: string[];
  blank: boolean; oneWord: boolean;
}
```

### Word pack format (`packages/shared/src/words/*.json`)
```json
{
  "id": "everyday",
  "title": "Everyday Objects",
  "pairs": [
    { "a": "egg", "b": "ball", "difficulty": "easy" },
    { "a": "pizza", "b": "flatbread", "difficulty": "medium" }
  ]
}
```
Rules:
- Each round picks a pair, then **randomly swaps** which side is civilian vs imposter so patterns can't be learned.
- No repeated pair within a session (reset when the pool is exhausted).
- Blank imposter: civilians get side `a` or `b`; imposter gets `null`.
- Ship at least 60 pairs across Animals, Food, Everyday Objects, Places, and a Mixed pack. Seed examples: egg/ball, cat/fox, pizza/flatbread, spoon/ladle, pen/pencil, moon/lantern, sofa/bench, bus/tram, sea/lake, tea/coffee, crow/bat, guitar/ukulele.

---

## 7. UI / UX spec

### 7.1 Design tokens (outdoor-first)
- Two themes: **Sun** (light, very high contrast) and **Night** (dark). Follow the system by default.
- Minimum body text 18 pt; card word 48–64 pt; tap targets ≥ 56 pt.
- Playing-card metaphor: rounded cards, subtle shadow, flip animation (Reanimated). Avoid tiny text and low-contrast greys.
- No sound required. Optional soft sound/haptic on **reveal only**, off by default (phones must not buzz mid-round). Respect reduce-motion.
- Palette is a placeholder: pick one bold accent + neutral surfaces; keep it easy to re-skin via a single `theme.ts`.

### 7.2 Screens

**S1 — Home**
```
┌───────────────────────┐
│       IMPOSTER        │
│   (logo / card art)   │
│                       │
│   [ Host a game ]     │
│   [ Join with code ]  │
└───────────────────────┘
```

**S2 — Profile pick (no typing)**
- Grid of emoji avatars + an auto-generated funny name ("Sneaky Mango") with a **Reroll** button. Stored locally for next time.

**S3 — Host lobby**
- Giant 4-letter code, QR, and IP hint. Avatars pop in as players join. Presence dot per player.
- Buttons: **Settings** (bottom sheet), **Start** (enabled at ≥ 3 players).

**S4 — Join**
- Big 4-box code entry using an on-screen **letter keypad** (custom, large keys; this is code entry, not free typing) or **Scan QR**.

**S5 — Settings sheet**
- Rounds, imposter count, blank imposter, one-word round, packs, difficulty. Sensible defaults; "Start" never requires opening this.

**S6 — Card (the core screen)**
```
┌───────────────────────┐
│  Round 3 of 8   ●●●○  │  ← round meter + signal dot
│                       │
│    ┌─────────────┐    │
│    │   (card     │    │
│    │    back)    │    │
│    └─────────────┘    │
│  Double-tap to peek   │
│                       │
│  [ Scores ]           │
└───────────────────────┘
```
Word card behavior:
- **First look each round:** single tap flips the card to reveal the word. Tap again (or after 4 s) to hide.
- **Re-check later:** requires a **double-tap**, reveals for **3 s**, then auto-hides.
- Auto-hide instantly on app background / app switcher / screenshot event.
- Use `usePreventScreenCapture` on this screen.
- Blank imposter: card shows an empty card with a small "no word" mark on flip.
- One-word round: a banner strip under the meter, visible even when the card is hidden.
- Host sees an extra bottom action: **Open Vote** (visible only on host phone, confirm sheet: "Everyone ready to vote?").
- No timers or countdown anywhere on this screen.

**S7 — Vote**
- Grid of avatars (eligible targets only; self greyed out/hidden). Tap one → highlight → **Confirm**.
- After confirming: "Waiting… 6/10 voted" (`vote_progress`, no names).
- Vote index shown in two-imposter games: "Vote 1 of 2".

**S8 — Reveal**
- Sequence: tallies slide in together → pause → removed player's avatar flips to show role → both words shown side by side ("Civilians: EGG • Imposter: BALL").
- If a second vote is needed: "Imposter still among you…" → S7 again.

**S9 — Scores**
- Points fly to each player. Leaderboard list. Round meter advances. Host button: **Next round**; others see "Waiting for host."

**S10 — Game over**
- Podium, awards carousel, **Play again** (primary), **Change settings**, **Leave**.

### 7.3 System states to design
- Reconnecting pill, host left (friendly session end message), player Away badge, kicked screen, room-not-found, host-only permission errors, minimum-player warning.

### 7.4 Accessibility
- Screen reader labels on avatars/votes, dynamic type support, color is never the only signal, reduce-motion alternative for flip animations. **Careful:** VoiceOver/TalkBack would read the word aloud — provide a setting "Announce word" off by default, and warn about privacy.

---

## 8. Engine details (`packages/shared`)

- `createRoom(settings)`, `reduce(state, action)`, `viewFor(state, playerId)` (returns the private view), `dealRound(state, rng)`.
- Inject `rng` for deterministic tests.
- Imposter selection: uniformly random among present players; ensure no player is imposter 3 rounds in a row when players ≥ 5 (soft fairness rule).
- Vote resolution function `resolveVote(votes, eligible) → { removedId | null, tallies }` with tie → `null`.
- `scoreRound(secret, votesByIndex, removedIds) → scoreDelta`.
- Host migration: the host leaving ends the session with a friendly message, since the engine lives on that phone.

---

## 9. Security & fairness (party-game level)
- Validate all host-only commands by `hostId`.
- Rate-limit messages per socket (e.g., 20/s), max message size 8 KB, ignore unknown `t`.
- Room codes are random; joining a started game is allowed only for **existing** `playerId`s (reconnect), not new players.
- The host phone technically holds all secrets; acceptable for an honor-system friends game. The host UI must never render other players' words.

---

## 10. Persistence
- Local only: player id + resume token, chosen avatar/name, last settings, last room (for quick rejoin). No accounts, no analytics in v1.

---

## 11. Testing checklist

**Engine (Vitest)**
- Tie → no removal, imposter survives.
- Two-imposter flow: civilian removed first → second vote happens; both removed → early end.
- Scoring table (normal, blank, two imposters, only correct voters score).
- No player receives another's word in `viewFor`.
- Word pairs don't repeat within a session; swap randomization works.

**Networking**
- Heartbeat: kill connection for 13 s → client shows Reconnecting; restore → `state_sync` restores card and phase.
- Duplicate `submit_vote` (same `cmdId`) counted once.
- Sequence-gap triggers `resync`.
- Partial NDJSON chunks and two messages in one chunk parse correctly.
- Host phone backgrounded/locked — document behavior, keep-awake on.

**UI**
- Card never shows word without the required gesture; hides on background.
- Works one-handed on small phones; readable in direct sunlight (manual check).
- 10-player lobby and vote grid fit without scrolling on a 6" phone.

---

## 12. Acceptance criteria (v1 done when…)
1. 3–10 players can join via phone-hosted LAN and complete a full game.
2. Card peeking works exactly as specified (single tap first look, double-tap re-check, 3 s auto-hide).
3. Vote → tally → reveal → scoring works for 1 and 2 imposters, including ties.
4. Blank imposter and one-word round modifiers work.
5. Reconnect restores a player's card and vote status.
6. No timers, buzzes, or typing in the core loop.

---

## 13. Expo setup commands (reference)
```bash
npx create-expo-app@latest apps/mobile --template default
cd apps/mobile
npx expo install expo-router expo-camera expo-network expo-secure-store \
  expo-keep-awake expo-screen-capture react-native-reanimated \
  react-native-svg expo-dev-client
npm i zustand zod react-native-qrcode-svg react-native-tcp-socket
# Dev build:
npx expo prebuild
npx expo run:android      # or: npx expo run:ios
```
Requires an Expo dev build (`expo-dev-client` / `expo prebuild`). Expo Go cannot run raw TCP sockets.

---

## 14. Working with Google Antigravity

- Antigravity reads workspace rules from `AGENTS.md`/`GEMINI.md` (CLI) or from Markdown files under `.agents/rules` (Antigravity 2.0; the older `.agent/rules` path still works). Check which surface you are using.
- Rule files have a length cap (about 12,000 characters per file per current docs), so keep rules **short** and point to this spec.
- Suggested Always-On rule (`.agents/rules/imposter.md`):
  ```md
  Before any task, read docs/SPEC.md. Follow its rules, protocol and phase plan.
  Game logic lives only in packages/shared and must stay pure TypeScript.
  UI talks to the Transport interface only. No timers, buzzes or typing in the core game loop.
  Write tests for engine changes. Do not modify docs/SPEC.md without asking.
  ```
- Use Planning mode for each phase, review the plan/artifacts, then let the agent implement. Commit after each phase.

---

## 15. Phase plan and agent prompts

**Phase 1 — Foundation**
> Create npm workspaces with packages/shared and apps/mobile only (Expo, expo-router, TypeScript). In packages/shared implement: protocol.ts (zod, spec section 5), types.ts, engine.ts (pure reducer with injectable rng, resolveVote, scoreRound, viewFor, soft fairness rule), 60+ word pairs, theme.ts, and ndjson.ts: a line framer that handles partial chunks and multiple messages per chunk. Add root scripts: typecheck, test, lint. Vitest tests: ties, two imposters, scoring, word swap and no-repeat, privacy of viewFor, NDJSON edge cases.

**Phase 2 — LAN spike**
> In apps/mobile add a single throwaway screen at /spike (no game UI). Install react-native-tcp-socket and expo-dev-client, and configure the iOS local network permission text in app.json. Host button: start a TCP server on port 47777, show the device IP (expo-network) and a QR. Join button: type an IP, connect, exchange app-level ping/pong every 5 s with RTT shown. Add a "Kill connection" button and auto-reconnect with backoff 0.5 to 5 s. Log every event on screen. Do not touch the engine. Output exact commands to build the dev client for Android and iOS.

**Phase 3 — LAN networking**
> In packages/shared add HostServer: it wraps the engine, takes an injected `createServer` factory (so it runs on Node `net` in tests and react-native-tcp-socket in the app), enforces hostId checks, rate limit 20 msg/s, 8 KB max line, seq numbers, cmdId dedupe, hello/resume, Away at 15 s. In apps/mobile add TcpTransport and the Zustand store. Add packages/shared/scripts/sim.ts, a Node CLI that starts a HostServer and N fake clients (3-10) and plays a full game including a mid-game disconnect and resume. Script: `npm run sim -w packages/shared -- --players 10 --rounds 3`.

**Phase 4 — Core screens**
> Build screens S1–S10 from section 7 using the TcpTransport abstraction. Implement profile pick S2, host lobby S3 with QR/IP, join S4, settings sheet S5, the exact card behavior in S6 (single-tap peek, double-tap re-peek, 3 s auto-hide, screen capture protection), voting S7, reveal S8, scores S9, and game over S10. Add the round meter, reconnecting pill, and system states from 7.3.

**Phase 5 — Polish & hardening**
> Awards, reveal animations, reduce-motion alternative, accessibility settings (screen reader labels, audio announcement warning), Sun/Night theme QA with outdoor high contrast, error/disconnect states, app icon, splash, and production dev-client verification.

---

## 16. Out of scope for v1
Accounts, online matchmaking, in-app chat/voice, custom word packs (later), timers, ads, monetization.

## 17. Open questions to settle early
- Room-code letter keypad vs. QR-only join on small screens.
- Whether "Sometimes" modifiers should be 25% or host-tunable.
- Whether to keep awards purely fun or let them influence points (recommended: fun only).
