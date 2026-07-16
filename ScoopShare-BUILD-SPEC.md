# ScoopShare — Build Specification

An in-person icebreaker game for a company townhall. Players join on their own
phones, get a random 3-scoop ice cream cone, and physically walk around the
room negotiating trades until they get 3 scoops of one flavor. First to a
matching cone wins.

Target: **25–75 players**, live event on **Thursday, July 23, 2026**.

---

## 1. Core Game Rules

1. Player opens the app, enters their name, joins the lobby.
2. Host starts the game. Every player is dealt 3 scoops, each an
   independently random flavor (duplicates allowed — e.g. 2x Vanilla + 1x
   Mint).
3. Players talk to each other in person to figure out who has what, and
   negotiate trades face-to-face.
4. To execute a trade, Player A opens the app, selects Player B, picks which
   of A's scoops to give up, and which flavor A wants in return. This sends
   a proposal to B's phone.
5. Player B sees the incoming proposal (offered flavor → requested flavor)
   and can Accept or Decline.
6. On accept, the swap executes instantly for both players.
7. **Anti-spam cooldown**: if Player A requests a flavor that Player B
   doesn't actually hold, or Player B declines a valid proposal, Player A
   is locked out of proposing any new swap for 5 seconds. This is what
   keeps someone from firing off requests to the whole room instead of
   actually talking to people — see §4 for the mechanics.
8. First player to hold 3 scoops of the same flavor wins. Game keeps running
   for everyone else (multiple people can win) until the host ends it.
9. Host has a big-screen view (projected) showing the QR code before start,
   and a live "who's joined / who's won" view during play.

---

## 2. Tech Stack

- **Framework**: Next.js 14 (App Router), deployed on Vercel
- **State store**: Vercel KV (Upstash Redis) — simple key/value, low latency,
  no schema migrations to manage under time pressure
- **Sync strategy**: Polling, not WebSockets (see §8 — this is a deliberate
  simplicity choice given the timeline)
- **Styling**: Tailwind CSS
- **Graphics**: Hand-built SVG (single scoop shape, single cone shape, both
  recolored/patterned per flavor at render time — no image assets needed)
- **QR code**: `qrcode.react` (or similar) rendered on the host screen,
  pointing at the join URL
- **Identity**: No auth. On join, generate a UUID, store it in
  `localStorage`. That UUID is the player's session key for the rest of the
  game — this lets someone's phone lock or refresh mid-game without losing
  their spot.

### Environment variables needed
```
KV_REST_API_URL=
KV_REST_API_TOKEN=
NEXT_PUBLIC_BASE_URL=       # used to build the QR join link
```

---

## 3. Data Model

Store everything in KV as JSON blobs. Suggested keys:

```ts
// Key: `player:{playerId}`
type Player = {
  id: string;
  name: string;
  scoops: [FlavorId, FlavorId, FlavorId];
  joinedAt: number;
  hasWon: boolean;
  wonAt: number | null;
  lockedUntil: number | null; // epoch ms; can't propose a new swap while Date.now() < lockedUntil
};

// Key: `proposal:{proposalId}`
type SwapProposal = {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offeredFlavor: FlavorId;   // flavor A is giving up
  requestedFlavor: FlavorId; // flavor A wants from B
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: number;
};

// Key: `game:state` (singleton)
type GameState = {
  status: "lobby" | "active" | "ended";
  startedAt: number | null;
  endedAt: number | null;
};

// Key: `game:playerIndex` — a Set or list of all playerIds, so we can
// enumerate players for the "pick who to swap with" search and the host
// dashboard without scanning KV.

// Key: `game:proposalsByPlayer:{playerId}` — list of pending proposal IDs
// addressed to this player, for fast lookup on poll.

type FlavorId =
  | "vanilla"
  | "chocolate"
  | "strawberry"
  | "mint-choc-chip"
  | "cookies-and-cream"
  | "bubblegum";
```

### Flavor config (single source of truth, used by both the SVG renderer and
the game logic)

```ts
const FLAVORS: Record<FlavorId, { label: string; color: string; pattern: "solid" | "dots" | "swirl" | "chips" | "sprinkles" }> = {
  vanilla:            { label: "Vanilla",            color: "#F5E6C8", pattern: "solid" },
  chocolate:          { label: "Chocolate",          color: "#6B4226", pattern: "solid" },
  strawberry:         { label: "Strawberry",         color: "#F4A6B0", pattern: "swirl" },
  "mint-choc-chip":   { label: "Mint Choc Chip",     color: "#A8D8C0", pattern: "chips" },
  "cookies-and-cream":{ label: "Cookies & Cream",    color: "#EDEDED", pattern: "dots" },
  bubblegum:          { label: "Bubblegum",          color: "#F9B4E0", pattern: "sprinkles" },
};
```

Color **and** pattern both encode flavor (not color alone) so it stays
readable for colorblind players and works if someone's screen brightness is
blown out under townhall lighting.

Randomize scoop assignment as fully independent random picks per scoop
(uniform over the 6 flavors) — no balancing logic needed. With 25–75 players
× 3 scoops, the flavor pool naturally spreads out enough for trades to be
meaningful.

---

## 4. API Routes

All under `/app/api/`:

| Route | Method | Purpose |
|---|---|---|
| `/api/join` | POST | `{ name }` → creates Player, adds to index, returns `{ playerId }` |
| `/api/state` | GET | `?playerId=` → returns this player's current scoops, `hasWon`, `lockedUntil`, and any pending incoming proposals. **This is the polling endpoint.** |
| `/api/players` | GET | Returns `{ id, name, hasWon }[]` for the swap-target picker (no scoop info — you shouldn't be able to see someone's hand without asking them) |
| `/api/propose` | POST | `{ fromPlayerId, toPlayerId, offeredFlavor, requestedFlavor }` → see "Cooldown rule" below for the full validation order |
| `/api/respond` | POST | `{ proposalId, accept: boolean }` → on accept, re-validates both players still hold the relevant scoops, then atomically swaps and marks proposal accepted; on decline, marks declined **and sets the proposer's `lockedUntil` to `now + 5000`** |
| `/api/host/start` | POST | Host-only. Deals scoops to all lobby players, flips `game:state.status` to `active` |
| `/api/host/reset` | POST | Host-only. Wipes all players/proposals, resets to `lobby` — for dry runs and recovering from mistakes |
| `/api/host/summary` | GET | Returns player count, list of winners, for the big-screen view |

### Cooldown rule (anti-spam)

`/api/propose` validates in this order:

1. **Is the proposer currently locked?** If `Date.now() < player.lockedUntil`,
   reject immediately with the remaining ms — don't touch anything else. The
   client uses this to keep the "Propose a Swap" button disabled with a
   live countdown.
2. **Does the proposer actually hold `offeredFlavor`?** (existing check)
3. **Does the target actually hold `requestedFlavor` right now?** This is
   new. If not, this is a "no-match" — set the proposer's `lockedUntil =
   Date.now() + 5000` and return an error to A immediately. **Do not create
   a SwapProposal or notify B at all** — B never sees a request for
   something they don't have, so this doubles as protection against
   pestering people with impossible asks.
4. If both checks pass, create the `SwapProposal` as normal and it goes to
   B for accept/decline.

So there are exactly two ways to trigger the 5-second lock: an immediate
no-match at propose time (step 3 above), or an explicit decline from B at
respond time. Accepting never triggers it.

Enforce the lock **server-side**, not just in the UI — always set
`lockedUntil = Date.now() + 5000` (replacing any earlier value, not adding
to it) so a burst of bad luck doesn't compound into a much longer lockout.
Client-side countdown is just a convenience; a second tab or a manual
`/api/propose` call still has to pass the server check.

**Validation rule that matters most**: always re-check scoop ownership at
`/api/respond` time, not just at `/api/propose` time. Someone could complete
a different trade in the gap between proposing and the other person
accepting. If the check fails, auto-mark the proposal `expired` and tell the
responding player it's no longer valid (no lock applied in this case — it's
a timing issue, not a bad request or a decline).

Proposals older than 2 minutes and still `pending` should be treated as
expired (check this lazily on read, no cron needed).

---

## 5. Screens

### 5a. Host / Big Screen (`/host`)
- **Pre-game**: Large QR code + short join URL as text fallback, live
  counter of players joined, a "Start Game" button.
- **In-game**: Live count of players, live list of winners as they occur
  (name + time), a "Reset Game" button (with confirm).

### 5b. Join (`/`)
- Single field: name input, "Join" button.
- On submit, calls `/api/join`, stores `playerId` in localStorage, routes to
  `/play`.
- If a `playerId` already exists in localStorage, skip straight to `/play`
  (handles refresh/reconnect).

### 5c. Lobby (`/play` when `game:state.status === "lobby"`)
- "You're in! Waiting for the host to start…" with a friendly animated
  cone icon.

### 5d. Main Game (`/play` when `status === "active"`)
- Your cone: 3 scoops stacked on a cone, rendered via the SVG component.
- A "Propose a Swap" button opening a flow:
  1. Search/select a player by name (typeahead — matters at 75 players)
  2. Select which of your 3 scoops to offer
  3. Select which flavor you want back (picker of the 6 flavors)
  4. Send
- Incoming proposals surface as a banner/card at the top of the screen the
  moment they appear on poll: "Alex wants to trade you their Vanilla for
  your Mint Choc Chip" → Accept / Decline buttons.
- Small flavor legend (swatch + pattern + name) always visible so people can
  describe what they have out loud without needing to remember hex codes.
- **Cooldown state**: whenever `lockedUntil` (from `/api/state`, not just
  local state — see §4) is in the future, the "Propose a Swap" button is
  disabled and shows a live countdown, e.g. "Try again in 4s". Trigger the
  same disabled state the instant a propose call comes back as a no-match,
  and the instant a poll reveals one of your outgoing proposals was
  declined — no need to wait for a fresh countdown to be echoed back if you
  already know it happened.

### 5e. Win State
- When `hasWon` flips true: confetti burst, "You did it! 🍦" message, cone
  shown with all 3 matching scoops. Player can keep swapping to help others
  or just watch — game doesn't lock them out.

---

## 6. SVG Scoop Component

One shared component, parameterized by flavor:

```tsx
function Scoop({ flavor, stackIndex }: { flavor: FlavorId; stackIndex: 0 | 1 | 2 }) {
  const { color, pattern } = FLAVORS[flavor];
  // base shape: a single rounded scoop path, reused for every flavor
  // pattern is applied as an SVG <pattern> fill (dots/swirl/chips/sprinkles)
  // layered on top of the solid color fill
  // stackIndex controls vertical offset so 3 scoops stack believably on the cone
}
```

- One cone SVG (waffle-texture triangle), 3 `<Scoop>` instances stacked on
  top, each recolored/patterned per that slot's flavor.
- Keep the base scoop path identical across flavors — only fill/pattern
  change — so there's exactly one shape to get right visually.

---

## 7. Realtime Sync Strategy

Poll `/api/state` every **2 seconds** while on `/play` with an active game.
That's it. At 75 concurrent players × one small GET every 2s, this is well
within Vercel's and Upstash's free/hobby tier limits.

Why not WebSockets/Pusher: for a room-scale, few-second-latency icebreaker,
a 2-second poll is imperceptible in practice, and it removes an entire piece
of infrastructure (a Pusher/Ably account, connection handling, reconnect
logic) that isn't needed to hit Thursday's deadline. If live testing shows
it feels laggy, swapping the poll loop for Pusher's channel-based push is a
contained change — isolate the polling logic behind a single hook (e.g.
`useGameState(playerId)`) so that swap is a one-file change later, not a
rewrite.

---

## 8. Edge Cases to Handle

- **Duplicate names**: append a number (`Alex`, `Alex (2)`) rather than
  rejecting — people will absolutely reuse first names at a townhall.
- **Stale proposals**: re-validate at accept-time (see §4); auto-expire
  after 2 minutes.
- **Reconnect**: localStorage `playerId` must survive refresh/lock screen;
  `/api/join` should be a no-op if a valid playerId is already stored.
- **Host mistakes**: `/api/host/reset` needs to be safe to hit mid-event
  without crashing anyone's client — clients should handle "player not
  found" by bouncing back to `/`.
- **Mobile-first only**: assume every player is on a phone in one hand.
  Big touch targets, no hover-dependent UI, portrait orientation.
- **Simultaneous proposals**: two people can each have proposals in flight
  to each other at once — that's fine, they're independent records, just
  make sure accepting one doesn't invalidate the other unless the scoop
  ownership check actually fails.
- **Cooldown persistence**: `lockedUntil` lives on the Player record in KV,
  not in browser state, so a refresh or a second tab can't be used to dodge
  the 5-second lock.

---

## 9. Explicitly Out of Scope

Keep Copilot from over-building here:

- No authentication/accounts beyond the localStorage session
- No data persistence after the event (fine to let KV entries expire/be
  wiped)
- No spectator mode beyond the host big-screen view
- No sound effects/audio (nice-to-have, not required)
- No support for more than one simultaneous game/room — this is a
  single-event, single-game app

---

## 10. Build Order (targeting Thursday 7/23)

1. **Scaffold**: Next.js + Tailwind + Vercel KV wired up, deploy a "hello
   world" to Vercel immediately so the pipeline is proven early.
2. **Data layer**: KV helper functions for player CRUD, flavor config,
   random dealing logic.
3. **Join + Lobby + Host pre-game screen**: get the QR-to-lobby flow working
   end to end with fake/no game logic yet.
4. **SVG scoop/cone component**: build and visually verify all 6 flavors
   render distinctly.
5. **Core game screen**: display a player's dealt cone, wire `/api/host/start`.
6. **Swap flow**: propose → respond → atomic swap, with the 2s polling loop.
7. **Win detection + celebration state.**
8. **Host live dashboard** (player count, winners list).
9. **Dry run with 5-10 people** (colleagues, friends) on real phones over
   real wifi — this will surface the actual UX issues faster than any
   amount of solo testing.
10. **Buffer day** before Thursday for whatever the dry run breaks.
