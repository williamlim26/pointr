import { useCallback, useEffect, useRef, useState } from "react"
import { LS_CLIENT_ID, LS_NAME } from "../../shared/constants"
import type { GameState } from "./types"
import JoinScreen from "./JoinScreen"
import VotingScreen from "./VotingScreen"
import RevealedScreen from "./RevealedScreen"

function getRoomId(): string {
  const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9]+)$/)
  if (match) return match[1]

  const id = Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12)
  window.history.replaceState(null, "", `/r/${id}`)
  return id
}

function getOrCreateClientId(): string {
  let id = localStorage.getItem(LS_CLIENT_ID)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(LS_CLIENT_ID, id)
  }
  return id
}

const WS_URL =
  window.location.protocol === "https:"
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`

const BACKOFF_STEPS = [1000, 2000, 4000, 10000]

export default function App() {
  const roomId = useRef(getRoomId())
  const clientId = useRef(getOrCreateClientId())

  const [joined, setJoined] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [connected, setConnected] = useState(false)
  const [myVote, setMyVote] = useState<number | "?" | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const nameRef = useRef(localStorage.getItem(LS_NAME) ?? "")
  const hasJoinedRef = useRef(false) // true only after user explicitly clicks Join
  const backoffIdx = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable send — only delivers if socket is open
  const send = useCallback((msg: object) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }, [])

  useEffect(() => {
    // `cancelled` is local to this effect invocation.
    // StrictMode's cleanup sets its own cancelled=true without poisoning the
    // second invocation's closure, which starts with its own cancelled=false.
    let cancelled = false

    const connect = () => {
      if (cancelled) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        backoffIdx.current = 0
        setConnected(true)
        // Re-send join on reconnect — but only if the user already explicitly joined.
        // nameRef alone is not enough: it's pre-populated from localStorage on mount,
        // which would auto-join before the user confirms their name.
        if (hasJoinedRef.current && nameRef.current) {
          ws.send(JSON.stringify({
            type: "join",
            roomId: roomId.current,
            name: nameRef.current,
            clientId: clientId.current,
          }))
          setJoined(true)
        }
      }

      ws.onmessage = (event) => {
        let msg: { type: string } & Record<string, unknown>
        try {
          msg = JSON.parse(event.data as string) as { type: string } & Record<string, unknown>
        } catch {
          return
        }

        if (msg.type === "state") {
          const state = msg as unknown as GameState
          setGameState(state)
          // Sync myVote from server on reconnect during revealed phase
          const me = state.players.find((p) => p.clientId === clientId.current)
          if (me && state.phase === "revealed") setMyVote(me.vote)
        }

        if (msg.type === "error") {
          console.warn("Server error:", msg.code, msg.message)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (cancelled) return
        const delay = BACKOFF_STEPS[Math.min(backoffIdx.current, BACKOFF_STEPS.length - 1)]
        backoffIdx.current++
        reconnectTimer.current = setTimeout(connect, delay)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, []) // connection lifecycle is intentionally mount-scoped

  const joinRoom = useCallback((name: string) => {
    nameRef.current = name
    hasJoinedRef.current = true
    localStorage.setItem(LS_NAME, name)
    send({ type: "join", roomId: roomId.current, name, clientId: clientId.current })
    setJoined(true)
  }, [send])

  const vote = useCallback((value: number | "?") => {
    setMyVote(value)
    send({ type: "vote", value })
  }, [send])

  const reveal = useCallback(() => send({ type: "reveal" }), [send])

  const reset = useCallback((story?: string) => {
    setMyVote(null)
    send({ type: "reset", story })
  }, [send])

  const setStory = useCallback((story: string) => {
    send({ type: "set_story", story })
  }, [send])

  if (!joined) return <JoinScreen onJoin={joinRoom} />

  if (!connected) {
    return (
      <div style={styles.overlay}>
        <p style={styles.reconnecting}>Reconnecting…</p>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div style={styles.overlay}>
        <p style={styles.reconnecting}>Joining room…</p>
      </div>
    )
  }

  if (gameState.phase === "revealed") {
    return (
      <RevealedScreen
        state={gameState}
        myClientId={clientId.current}
        onReset={reset}
      />
    )
  }

  return (
    <VotingScreen
      state={gameState}
      myClientId={clientId.current}
      myVote={myVote}
      onVote={vote}
      onReveal={reveal}
      onSetStory={setStory}
    />
  )
}

const styles = {
  overlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  } as React.CSSProperties,
  reconnecting: {
    color: "#888",
    fontSize: 16,
    letterSpacing: 0.5,
  } as React.CSSProperties,
}
