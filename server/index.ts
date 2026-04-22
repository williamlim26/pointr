import { FIBONACCI_VALUES, MAX_ROOM_SIZE } from "../shared/constants"
import type { CardValue } from "../shared/constants"
import type { ClientMessage, ErrorMessage } from "./messages"
import {
  getOrCreateRoom,
  getRoom,
  addPlayer,
  recoverDisconnected,
  disconnectPlayer,
  isRoomFull,
  broadcastState,
  removeRoom,
  reassignFacilitatorIfNeeded,
} from "./rooms"

const PORT = parseInt(process.env.PORT || "3001")

type WsData = { clientId: string; roomId: string }

function sendError(
  ws: import("bun").ServerWebSocket<WsData>,
  code: ErrorMessage["code"],
  message: string
): void {
  ws.send(JSON.stringify({ type: "error", code, message } satisfies ErrorMessage))
}

function handleJoin(
  ws: import("bun").ServerWebSocket<WsData>,
  msg: Extract<ClientMessage, { type: "join" }>
): void {
  const { roomId, name, clientId, isSpectator = false, roomName } = msg

  if (!name || name.trim().length === 0) {
    sendError(ws, "name_required", "Name is required to join.")
    return
  }

  const room = getOrCreateRoom(roomId)

  // Set room name from first player who provides one
  if (room.name === null && roomName) {
    room.name = roomName.trim() || null
  }

  // Attempt to recover a recently-disconnected session
  const recovered = recoverDisconnected(room, clientId, ws)
  if (recovered) {
    ws.data.clientId = clientId
    ws.data.roomId = roomId
    broadcastState(room)
    return
  }

  if (isRoomFull(room)) {
    sendError(ws, "room_full", `Room is full (max ${MAX_ROOM_SIZE} players).`)
    return
  }

  addPlayer(room, {
    clientId,
    name: name.trim(),
    ws,
    vote: null,
    isSpectator,
  })

  // First player in the room becomes the facilitator
  if (room.facilitatorClientId === null) {
    room.facilitatorClientId = clientId
  }

  ws.data.clientId = clientId
  ws.data.roomId = roomId

  broadcastState(room)
}

function handleVote(
  ws: import("bun").ServerWebSocket<WsData>,
  msg: Extract<ClientMessage, { type: "vote" }>
): void {
  const room = getRoom(ws.data.roomId)
  if (!room) { sendError(ws, "room_not_found", "Room not found."); return }

  if (room.phase !== "voting") return // Silently ignore votes during revealed phase

  const player = room.players.get(ws.data.clientId)
  if (!player) return

  if (!(FIBONACCI_VALUES as readonly unknown[]).includes(msg.value)) {
    sendError(ws, "invalid_message", "Invalid vote value.")
    return
  }

  player.vote = msg.value as CardValue
  room.lastActivity = Date.now()
  broadcastState(room)
}

function handleReveal(ws: import("bun").ServerWebSocket<WsData>): void {
  const room = getRoom(ws.data.roomId)
  if (!room) { sendError(ws, "room_not_found", "Room not found."); return }

  if (room.facilitatorClientId !== ws.data.clientId) return // silently ignore

  room.phase = "revealed"
  room.lastActivity = Date.now()
  broadcastState(room)
}

function handleReset(
  ws: import("bun").ServerWebSocket<WsData>,
  msg: Extract<ClientMessage, { type: "reset" }>
): void {
  const room = getRoom(ws.data.roomId)
  if (!room) { sendError(ws, "room_not_found", "Room not found."); return }

  room.phase = "voting"
  room.story = msg.story?.trim() || null
  room.lastActivity = Date.now()

  for (const player of room.players.values()) {
    player.vote = null
  }

  broadcastState(room)
}

function handleSetStory(
  ws: import("bun").ServerWebSocket<WsData>,
  msg: Extract<ClientMessage, { type: "set_story" }>
): void {
  const room = getRoom(ws.data.roomId)
  if (!room) { sendError(ws, "room_not_found", "Room not found."); return }

  if (typeof msg.story !== "string") {
    sendError(ws, "invalid_message", "story must be a string.")
    return
  }

  room.story = msg.story.trim() || null
  room.lastActivity = Date.now()
  broadcastState(room)
}

const server = Bun.serve<WsData>({
  port: PORT,

  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, { data: { clientId: "", roomId: "" } })
      if (upgraded) return undefined
      return new Response("WebSocket upgrade failed", { status: 400 })
    }

    // Serve static files from client/dist in production
    const distPath = `${import.meta.dir}/../client/dist`
    const filePath = url.pathname === "/" || url.pathname.startsWith("/r/")
      ? `${distPath}/index.html`
      : `${distPath}${url.pathname}`

    const file = Bun.file(filePath)
    return new Response(file)
  },

  websocket: {
    open(ws) {
      // Data populated on first "join" message
    },

    message(ws, raw) {
      let msg: ClientMessage
      try {
        msg = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as ClientMessage
      } catch {
        sendError(ws, "invalid_message", "Invalid JSON.")
        return
      }

      if (!msg || typeof msg.type !== "string") {
        sendError(ws, "invalid_message", "Missing message type.")
        return
      }

      switch (msg.type) {
        case "join":       return handleJoin(ws, msg)
        case "vote":       return handleVote(ws, msg)
        case "reveal":     return handleReveal(ws)
        case "reset":      return handleReset(ws, msg)
        case "set_story":  return handleSetStory(ws, msg)
        default:
          sendError(ws, "invalid_message", `Unknown message type: ${(msg as { type: string }).type}`)
      }
    },

    close(ws) {
      const { clientId, roomId } = ws.data
      if (!clientId || !roomId) return

      const room = getRoom(roomId)
      if (!room) return

      disconnectPlayer(room, clientId, () => {
        // Called when the 30s grace period expires
        const r = getRoom(roomId)
        if (r) {
          reassignFacilitatorIfNeeded(r)
          r.lastActivity = Date.now()
          broadcastState(r)
        }
      })

      // Broadcast immediately so remaining players see the player leave
      broadcastState(room)
    },
  },
})

console.log(`Planning Poker server listening on http://localhost:${server.port}`)
