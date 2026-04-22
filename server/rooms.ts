import type { ServerWebSocket } from "bun"
import {
  FIBONACCI_NUMBERS,
  MAX_ROOM_SIZE,
  ROOM_IDLE_TIMEOUT_MS,
  ROOM_SWEEP_INTERVAL_MS,
  DISCONNECT_GRACE_PERIOD_MS,
} from "../shared/constants"
import type { CardValue } from "../shared/constants"
import type { StateMessage, PlayerView } from "./messages"

export interface Player {
  clientId: string
  name: string
  ws: ServerWebSocket<{ clientId: string; roomId: string }>
  vote: CardValue | null
}

interface DisconnectedEntry {
  player: Player
  expiresAt: number
  timer: ReturnType<typeof setTimeout>
}

export interface Room {
  id: string
  story: string | null
  phase: "voting" | "revealed"
  facilitatorClientId: string | null
  players: Map<string, Player>
  disconnected: Map<string, DisconnectedEntry>
  lastActivity: number
}

const rooms = new Map<string, Room>()

export function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId)
  if (!room) {
    room = {
      id: roomId,
      story: null,
      phase: "voting",
      facilitatorClientId: null,
      players: new Map(),
      disconnected: new Map(),
      lastActivity: Date.now(),
    }
    rooms.set(roomId, room)
  }
  return room
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId)
}

export function addPlayer(room: Room, player: Player): void {
  // clientId collision: last-join wins — disconnect the existing session
  const existing = room.players.get(player.clientId)
  if (existing) {
    try {
      existing.ws.close(1000, "replaced by new session")
    } catch {}
  }
  room.players.set(player.clientId, player)
  room.lastActivity = Date.now()
}

export function recoverDisconnected(
  room: Room,
  clientId: string,
  newWs: ServerWebSocket<{ clientId: string; roomId: string }>
): Player | null {
  const entry = room.disconnected.get(clientId)
  if (!entry) return null

  clearTimeout(entry.timer)
  room.disconnected.delete(clientId)

  const recovered = { ...entry.player, ws: newWs }
  room.players.set(clientId, recovered)
  return recovered
}

export function disconnectPlayer(room: Room, clientId: string, onExpired: () => void): void {
  const player = room.players.get(clientId)
  if (!player) return

  room.players.delete(clientId)

  const timer = setTimeout(() => {
    room.disconnected.delete(clientId)
    onExpired()
  }, DISCONNECT_GRACE_PERIOD_MS)

  room.disconnected.set(clientId, {
    player,
    expiresAt: Date.now() + DISCONNECT_GRACE_PERIOD_MS,
    timer,
  })
}

export function removeRoom(roomId: string): void {
  const room = rooms.get(roomId)
  if (!room) return

  // Cancel all pending disconnect timers
  for (const entry of room.disconnected.values()) {
    clearTimeout(entry.timer)
  }
  rooms.delete(roomId)
}

export function isRoomFull(room: Room): boolean {
  return room.players.size >= MAX_ROOM_SIZE
}

// Reassign facilitator to any remaining active player (called when the current facilitator leaves permanently)
export function reassignFacilitatorIfNeeded(room: Room): void {
  if (room.players.has(room.facilitatorClientId ?? "")) return // still in the room
  const next = room.players.keys().next()
  room.facilitatorClientId = next.done ? null : next.value
}

// Nearest Fibonacci; ties go to the higher value
function nearestFibonacci(value: number): number {
  let best = FIBONACCI_NUMBERS[0]
  let bestDist = Math.abs(value - best)
  for (const f of FIBONACCI_NUMBERS) {
    const dist = Math.abs(value - f)
    if (dist < bestDist || (dist === bestDist && f > best)) {
      best = f
      bestDist = dist
    }
  }
  return best
}

export function computeMedian(room: Room): number | null {
  const numeric: number[] = []
  for (const p of room.players.values()) {
    if (typeof p.vote === "number") numeric.push(p.vote)
  }
  if (numeric.length === 0) return null

  numeric.sort((a, b) => a - b)
  const mid = Math.floor(numeric.length / 2)

  if (numeric.length % 2 === 1) return numeric[mid]

  const avg = (numeric[mid - 1] + numeric[mid]) / 2
  return nearestFibonacci(avg)
}

export function buildStateMessage(room: Room): StateMessage {
  const median = room.phase === "revealed" ? computeMedian(room) : null
  const players: PlayerView[] = []
  let numericVoteCount = 0
  let questionCount = 0

  for (const p of room.players.values()) {
    const voted = p.vote !== null
    if (voted) {
      if (p.vote === "?") questionCount++
      else numericVoteCount++
    }
    players.push({
      clientId: p.clientId,
      name: p.name,
      voted,
      vote: room.phase === "revealed" ? p.vote : null,
    })
  }

  return {
    type: "state",
    phase: room.phase,
    facilitatorClientId: room.facilitatorClientId,
    players,
    story: room.story,
    numericVoteCount,
    questionCount,
    totalPlayers: room.players.size,
    median,
  }
}

export function broadcastState(room: Room): void {
  const msg = JSON.stringify(buildStateMessage(room))
  for (const p of room.players.values()) {
    try {
      p.ws.send(msg)
    } catch {}
  }
}

// Sweep idle rooms every 5 minutes
const sweepInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, room] of rooms) {
    if (now - room.lastActivity > ROOM_IDLE_TIMEOUT_MS) {
      // Close any still-open WebSocket connections before removing
      for (const p of room.players.values()) {
        try { p.ws.close(1001, "Room expired due to inactivity") } catch {}
      }
      removeRoom(id)
    }
  }
}, ROOM_SWEEP_INTERVAL_MS)

// Prevent the interval from keeping the process alive if nothing else is running
if (typeof sweepInterval === "object" && sweepInterval !== null && "unref" in sweepInterval) {
  (sweepInterval as NodeJS.Timeout).unref()
}
