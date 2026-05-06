import { useRef, useState } from "react"
import { LS_NAME } from "../../shared/constants"

interface Props {
  roomName: string | null
  onJoin: (name: string, isSpectator: boolean) => void
}

export default function JoinScreen({ roomName, onJoin }: Props) {
  const [name, setName] = useState(localStorage.getItem(LS_NAME) ?? "")
  const [isSpectator, setIsSpectator] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Please enter your name")
      inputRef.current?.focus()
      return
    }
    onJoin(trimmed, isSpectator)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Pointr</h1>
        {roomName && (
          <p style={s.roomName}>{roomName}</p>
        )}
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label} htmlFor="name">Your name</label>
          <input
            id="name"
            ref={inputRef}
            style={{ ...s.input, ...(error ? { borderColor: "#ef4444" } : {}) }}
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError("") }}
            autoFocus
            maxLength={40}
          />
          {error && <span style={s.errorMsg}>{error}</span>}
          <label style={s.spectatorLabel}>
            <input
              type="checkbox"
              checked={isSpectator}
              onChange={(e) => setIsSpectator(e.target.checked)}
              style={s.checkbox}
            />
            <span>Join as spectator</span>
            <span style={s.spectatorHint}> — watch without voting</span>
          </label>
          <button style={s.button} type="submit">
            Join room
          </button>
        </form>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#0f1117",
  },
  card: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: "40px 48px",
    width: 360,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#e8eaf0",
    textAlign: "center",
  },
  roomName: {
    fontSize: 15,
    color: "#7db8f7",
    textAlign: "center",
    fontWeight: 500,
    marginTop: -12,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: "#999",
    fontWeight: 500,
  },
  input: {
    background: "#111420",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 15,
    color: "#e8eaf0",
    outline: "none",
    transition: "border-color 0.15s",
  },
  spectatorLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#aaa",
    cursor: "pointer",
    userSelect: "none",
  },
  checkbox: {
    accentColor: "#4f8ef7",
    width: 15,
    height: 15,
    cursor: "pointer",
    flexShrink: 0,
  },
  spectatorHint: {
    color: "#555",
  },
  errorMsg: {
    fontSize: 13,
    color: "#ef4444",
    marginTop: -4,
  },
  button: {
    marginTop: 4,
    padding: "12px 0",
    background: "#4f8ef7",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s",
  },
}
