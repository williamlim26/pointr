import { useState } from "react"

interface Props {
  onCreateRoom: (name: string) => void
}

export default function HomeScreen({ onCreateRoom }: Props) {
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateRoom(name.trim())
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Pointr</h1>
        <p style={s.subtitle}>Planning poker for your team.</p>
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label} htmlFor="room-name">Session name <span style={s.optional}>(optional)</span></label>
          <input
            id="room-name"
            style={s.input}
            type="text"
            placeholder="Sprint 42, Q2 planning…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={80}
          />
          <button style={s.button} type="submit">
            Create room
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
    width: 380,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#e8eaf0",
    textAlign: "center",
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    color: "#999",
    fontWeight: 500,
  },
  optional: {
    color: "#555",
    fontWeight: 400,
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
