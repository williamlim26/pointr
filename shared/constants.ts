export const FIBONACCI_VALUES = [1, 2, 3, 5, 8, 13, 21, "?"] as const
export type CardValue = (typeof FIBONACCI_VALUES)[number]
export type NumericCardValue = Exclude<CardValue, "?">

export const FIBONACCI_NUMBERS = [1, 2, 3, 5, 8, 13, 21] as const

export const MAX_ROOM_SIZE = 30
export const ROOM_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours
export const ROOM_SWEEP_INTERVAL_MS = 5 * 60 * 1000    // 5 minutes
export const DISCONNECT_GRACE_PERIOD_MS = 30_000        // 30 seconds

export const LS_CLIENT_ID = "pp-id"
export const LS_NAME = "pp-name"
export const LS_IS_SPECTATOR = "pp-spectator"
