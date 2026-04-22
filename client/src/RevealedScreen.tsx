import { useState } from "react"
import type { GameState } from "./types"
import PlayerList from "./PlayerList"

interface Props {
  state: GameState
  myClientId: string
  onReset: (story?: string) => void
}

export default function RevealedScreen({ state, myClientId, onReset }: Props) {
  const { median, players, questionCount, story } = state
  const [nextStory, setNextStory] = useState("")

  const numericVotes = players
    .map((p) => p.vote)
    .filter((v): v is number => typeof v === "number")

  const hasVotes = numericVotes.length > 0 || questionCount > 0

  const spread =
    numericVotes.length >= 2
      ? Math.max(...numericVotes) - Math.min(...numericVotes)
      : 0

  const isSplit = spread >= 3

  const splitSummary = (): string => {
    if (!isSplit || numericVotes.length === 0) return ""

    const min = Math.min(...numericVotes)
    const max = Math.max(...numericVotes)

    const atMin = players.filter((p) => p.vote === min).map((p) => p.name)
    const atMax = players.filter((p) => p.vote === max).map((p) => p.name)

    const fmt = (names: string[]) =>
      names.length === 1 ? names[0] : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]

    return `Split vote — ${fmt(atMin)} at ${min}, ${fmt(atMax)} at ${max}. Discuss before setting.`
  }

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault()
    onReset(nextStory.trim() || undefined)
    setNextStory("")
  }

  return (
    <div style={s.layout}>
      <PlayerList state={state} myClientId={myClientId} />

      <main style={s.main}>
        {story && <p style={s.story}>{story}</p>}

        <div style={s.medianBlock}>
          {!hasVotes ? (
            <span style={s.noVotes}>No votes cast</span>
          ) : median !== null ? (
            <>
              <span style={s.medianLabel}>Median</span>
              <span style={s.medianValue}>{median}</span>
              {questionCount > 0 && (
                <span style={s.unsure}>({questionCount} player{questionCount > 1 ? "s" : ""} unsure)</span>
              )}
            </>
          ) : (
            <>
              <span style={s.noVotes}>All unsure</span>
              <span style={s.unsure}>Everyone voted ?</span>
            </>
          )}
        </div>

        {isSplit && (
          <p style={s.splitWarning}>{splitSummary()}</p>
        )}

        <form onSubmit={handleReset} style={s.resetForm}>
          <input
            style={s.nextInput}
            type="text"
            placeholder="Next story (optional)"
            value={nextStory}
            onChange={(e) => setNextStory(e.target.value)}
            maxLength={140}
          />
          <button style={s.nextBtn} type="submit">
            Next story
          </button>
        </form>
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    padding: "32px 48px",
    overflowY: "auto",
  },
  story: {
    fontSize: 18,
    fontStyle: "italic",
    color: "#888",
    textAlign: "center",
    maxWidth: 500,
  },
  medianBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  medianLabel: {
    fontSize: 13,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 600,
  },
  medianValue: {
    fontSize: 96,
    fontWeight: 800,
    color: "#e8eaf0",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  unsure: {
    fontSize: 14,
    color: "#888",
  },
  noVotes: {
    fontSize: 32,
    color: "#666",
    fontWeight: 600,
  },
  splitWarning: {
    fontSize: 14,
    color: "#f59e0b",
    textAlign: "center",
    maxWidth: 460,
    lineHeight: 1.5,
    padding: "12px 20px",
    background: "rgba(245,158,11,0.08)",
    borderRadius: 8,
    border: "1px solid rgba(245,158,11,0.2)",
  },
  resetForm: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 8,
  },
  nextInput: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    color: "#e8eaf0",
    outline: "none",
    width: 260,
  },
  nextBtn: {
    padding: "10px 24px",
    background: "#4f8ef7",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
}
