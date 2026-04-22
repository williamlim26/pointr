# Pointr

Real-time planning poker for engineering teams. No accounts, no setup — create a room and share the link.

**Live at:** https://pointr.fly.dev

---

## What it does

- **Create a room** with an optional session name (e.g. "Sprint 42")
- **Share the link** — teammates open it and enter their name to join
- **Vote in secret** using Fibonacci cards: 1, 2, 3, 5, 8, 13, 21, or ?
- **Reveal together** — only the facilitator (first to join) can flip the cards
- **See the result** — median score, outlier highlights (amber), split vote warning
- **Next story** — reset the board and keep going
- **Spectator mode** — join without voting; useful for PMs, observers, or note-takers
- Up to **30 participants** per room (players + spectators)

Rooms expire after **2 hours of inactivity**. State is in-memory — no database, no persistence between server restarts.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Server | [Bun](https://bun.sh) HTTP + WebSocket |
| Client | React 18 + Vite |
| Hosting | [Fly.io](https://fly.io) (single machine, `sjc` region) |
| Language | TypeScript throughout |

---

## Running locally

**Prerequisites:** [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)

```bash
git clone https://github.com/williamlim26/pointr.git
cd pointr

# Install dependencies
bun install
cd client && bun install && cd ..

# Start both server and client dev server
bun run dev
```

- Client: http://localhost:5173
- Server (WebSocket + API): http://localhost:3001

The Vite dev server proxies `/ws` to the Bun server automatically.

**Test with multiple players:** open http://localhost:5173 in a normal window and an incognito window, create a room in one, share the URL to the other.

---

## Deploying

The app is containerised with Docker and deploys to Fly.io.

**First time:**
```bash
brew install flyctl
fly auth signup          # or: fly auth login
fly apps create pointr   # or choose your own name
fly deploy
```

**Subsequent deploys:**
```bash
fly deploy
```

The Dockerfile builds the React client and serves it from the Bun server on port 8080. No separate static host needed.

> **Note:** Fly creates 2 machines by default for HA. Because room state is in-memory, run a single machine to avoid players splitting across instances:
> ```bash
> fly scale count 1 --yes
> ```

---

## Project structure

```
pointr/
├── client/          # React + Vite frontend
│   └── src/
│       ├── App.tsx          # Routing and WebSocket lifecycle
│       ├── HomeScreen.tsx   # Create room landing page
│       ├── JoinScreen.tsx   # Name input + spectator toggle
│       ├── VotingScreen.tsx # Card selection
│       ├── RevealedScreen.tsx
│       └── PlayerList.tsx
├── server/
│   ├── index.ts     # Bun HTTP + WebSocket server
│   ├── rooms.ts     # In-memory room state, vote logic, median
│   └── messages.ts  # Shared message types (client ↔ server)
├── shared/
│   └── constants.ts # Fibonacci values, limits, localStorage keys
├── Dockerfile
└── fly.toml
```

---

## Configuration

| Constant | Default | Location |
|----------|---------|----------|
| Max players per room | 30 | `shared/constants.ts` |
| Room idle timeout | 2 hours | `shared/constants.ts` |
| Disconnect grace period | 30 seconds | `shared/constants.ts` |
| Server port | 3001 (dev) / `$PORT` | `server/index.ts` |
