import { useCallback, useEffect, useRef, useState } from "react"
import { LS_CLIENT_ID, LS_NAME } from "../../shared/constants"
import type { GameState } from "./types"
import HomeScreen from "./HomeScreen"
import JoinScreen from "./JoinScreen"
import VotingScreen from "./VotingScreen"
import RevealedScreen from "./RevealedScreen"

function getRoomIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9]+)$/)
  return match ? match[1] : null
}

function isRoomPath(): boolean {
  return /^\/r\//.test(window.location.pathname)
}

function getRoomNameFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("name")
}

function generateRoomId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12)
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
  // "home" = landing, "join" = name/spectator entry, "room" = in the game, "not-found" = bad room URL
  const [screen, setScreen] = useState<"home" | "join" | "room" | "not-found">(
    getRoomIdFromUrl() ? "join" : isRoomPath() ? "not-found" : "home"
  )
  const [joined, setJoined] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [connected, setConnected] = useState(false)
  const [myVote, setMyVote] = useState<number | "?" | null>(null)

  const roomIdRef = useRef(getRoomIdFromUrl() ?? "")
  const roomNameRef = useRef(getRoomNameFromUrl())
  const clientId = useRef(getOrCreateClientId())
  const nameRef = useRef(localStorage.getItem(LS_NAME) ?? "")
  const hasJoinedRef = useRef(false)
  const isSpectatorRef = useRef(false)
  const backoffIdx = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const send = useCallback((msg: object) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }, [])

  useEffect(() => {
    let cancelled = false

    const connect = () => {
      if (cancelled) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        backoffIdx.current = 0
        setConnected(true)
        if (hasJoinedRef.current && nameRef.current) {
          ws.send(JSON.stringify({
            type: "join",
            roomId: roomIdRef.current,
            name: nameRef.current,
            clientId: clientId.current,
            isSpectator: isSpectatorRef.current,
          }))
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
          setScreen("room")
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
  }, [])

  const createRoom = useCallback((roomName: string) => {
    const id = generateRoomId()
    roomIdRef.current = id
    roomNameRef.current = roomName || null
    const q = roomName ? `?name=${encodeURIComponent(roomName)}` : ""
    window.history.pushState(null, "", `/r/${id}${q}`)
    setScreen("join")
  }, [])

  const joinRoom = useCallback((name: string, isSpectator: boolean) => {
    nameRef.current = name
    hasJoinedRef.current = true
    isSpectatorRef.current = isSpectator
    localStorage.setItem(LS_NAME, name)
    send({
      type: "join",
      roomId: roomIdRef.current,
      name,
      clientId: clientId.current,
      isSpectator,
      roomName: roomNameRef.current,
    })
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

  const leaveRoom = useCallback(() => {
    hasJoinedRef.current = false
    isSpectatorRef.current = false
    setJoined(false)
    setMyVote(null)
  }, [])

  if (screen === "not-found") {
    return (
      <div style={styles.overlay}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#e8eaf0", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Room not found</p>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>This link may be invalid or the room may no longer exist.</p>
          <a href="/" style={{ color: "#4f8ef7", fontSize: 14 }}>Create a new room →</a>
        </div>
      </div>
    )
  }

  if (screen === "home") {
    return <HomeScreen onCreateRoom={createRoom} />
  }

  if (screen === "join" || !joined) {
    return (
      <JoinScreen
        roomName={gameState?.roomName ?? roomNameRef.current}
        onJoin={joinRoom}
      />
    )
  }

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

  const isSpectator = isSpectatorRef.current

  if (gameState.phase === "revealed") {
    return (
      <RevealedScreen
        state={gameState}
        myClientId={clientId.current}
        onReset={reset}
        onLeave={leaveRoom}
      />
    )
  }

  return (
    <VotingScreen
      state={gameState}
      myClientId={clientId.current}
      myVote={myVote}
      isSpectator={isSpectator}
      onVote={vote}
      onReveal={reveal}
      onSetStory={setStory}
      onLeave={leaveRoom}
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
