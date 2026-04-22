import type { CardValue } from "../shared/constants"

// Client → Server
export type ClientMessage =
  | { type: "join"; roomId: string; name: string; clientId: string; isSpectator?: boolean; roomName?: string | null }
  | { type: "vote"; value: CardValue }
  | { type: "reveal" }
  | { type: "reset"; story?: string }
  | { type: "set_story"; story: string }

// Server → All clients in room
export interface StateMessage {
  type: "state"
  phase: "voting" | "revealed"
  facilitatorClientId: string | null
  players: PlayerView[]
  story: string | null
  roomName: string | null
  numericVoteCount: number
  questionCount: number
  totalPlayers: number
  median: number | null
}

export interface PlayerView {
  clientId: string
  name: string
  voted: boolean
  vote: number | "?" | null // null when phase=voting (hidden)
  isSpectator: boolean
}

// Server → Sending client only
export interface ErrorMessage {
  type: "error"
  code: "room_not_found" | "invalid_message" | "name_required" | "room_full"
  message: string
}

export type ServerMessage = StateMessage | ErrorMessage
