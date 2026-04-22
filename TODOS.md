# TODOS — Planning Poker

Deferred items captured during design + engineering review (2026-04-19).
These are not bugs — they are intentional v2 decisions.

---

## v1.1 (quick wins after core ships)

### Emoji reactions on reveal
After votes are revealed, each player can tap one emoji reaction (👍 🤯 🎉 etc.)
shown next to their name in the player list. Social layer that makes the reveal
moment more tangible on remote calls.

- **Effort:** human ~30min / CC ~6min
- **Protocol change needed:** new `reaction` message type: `{ type: "reaction", emoji: string }`. Server stores `reaction: string | null` on Player, broadcasts in state.
- **Observer permission:** any player (voter or observer) can react post-reveal
- **Reset behavior:** reactions cleared on each reset (like votes)

---

### localStorage persistence for session story log
Currently the session log (stories + medians from the sprint) lives in React
context and clears on page refresh. v1.1 option: write to `localStorage` on every
reset, reload on mount.

- **Effort:** human ~20min / CC ~4min
- **Key:** `localStorage["pp-session-log-{roomId}"]` — keyed by room so separate rooms don't cross-contaminate
- **Schema:** `Array<{ story: string | null, median: number | null, voterCount: number, ts: number }>`
- **Clear condition:** explicit "Clear log" button or room expiry — do not auto-clear on refresh

---

## v2 (substantial features)

### AI outlier explanation — "Why the spread?"
When revealed state shows split vote (`max - min >= 3`), a "Why the spread?" button
appears. Sends story title + vote breakdown to Claude API. Returns 1-2 sentence
insight surfacing the likely hidden assumption.

- **Effort:** human ~1 day / CC ~15min
- **Server change:** new `{ type: "explain_request" }` message. Server calls Anthropic API with structured prompt. Returns `{ type: "explain_result", text: string }` to all players.
- **Requires:** `ANTHROPIC_API_KEY` env var on server
- **UX:** text appears below the split-vote summary sentence; shows a loading state ("Thinking...")
- **This is the 10x differentiator.** Don't let it die in TODOS.

---

### Redis-backed room state (resilience against Fly.io restarts)
Fly machines can restart without warning for platform maintenance. Currently all
room state is in-memory — a restart loses every room.

- **Effort:** human ~2 days / CC ~20min
- **Approach:** Upstash Redis on Fly. Write full room snapshot (JSON) on every `broadcastState` call. On server startup or reconnect with unknown clientId in disconnected map, attempt to reload from Redis before treating as new player.
- **Key scheme:** `room:{roomId}` with 2h TTL (matches existing inactivity cleanup)
- **Risk:** adds external dependency and network latency to every state change. Benchmark before shipping.

---

### Mobile layout
Current two-column grid (player list left, cards right) breaks on phones.

- **Effort:** human ~1 day / CC ~20min
- **Approach:** responsive breakpoint at 640px — collapse to single column, cards become a horizontal scroll row, player list moves above cards
- **Blocker:** need design decision on card size at mobile dimensions (64×90 is too tall for phone screens)

---

## Explicitly NOT in scope (v1 or later)

- Jira/Linear integration — paste story URL → auto-fill story field
- User accounts / persistent rooms with history
- T-shirt sizes or custom card decks
- Room names (human-readable)
- CI/CD pipeline (manual `fly deploy` for now)
