export interface PlayerView {
  clientId: string
  name: string
  voted: boolean
  vote: number | "?" | null
}

export interface GameState {
  phase: "voting" | "revealed"
  facilitatorClientId: string | null
  players: PlayerView[]
  story: string | null
  numericVoteCount: number
  questionCount: number
  totalPlayers: number
  median: number | null
}
