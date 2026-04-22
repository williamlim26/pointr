export interface PlayerView {
  clientId: string
  name: string
  voted: boolean
  vote: number | "?" | null
  isSpectator: boolean
}

export interface GameState {
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
