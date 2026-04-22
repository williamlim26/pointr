import { useRef, useState } from "react"
import { LS_NAME } from "../../shared/constants"

interface Props {
  onJoin: (name: string) => void
}

export default function JoinScreen({ onJoin }: Props) {
  const [name, setName] = useState(localStorage.getItem(LS_NAME) ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    onJoin(trimmed)
  }

  const roomId = window.location.pathname.match(/^\/r\/([a-zA-Z0-9]+)$/)?.[1]

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Pointr</h1>
        {roomId && <p style={s.roomId}>Room <code style={s.code}>{roomId}</code></p>}
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label} htmlFor="name">Your name</label>
          <input
            id="name"
            ref={inputRef}
            style={s.input}
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={40}
          />
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
  roomId: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  code: {
    fontFamily: "monospace",
    color: "#888",
    background: "#111",
    padding: "2px 6px",
    borderRadius: 4,
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
