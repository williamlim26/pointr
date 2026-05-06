import { useEffect, useRef, useState } from "react"
import { FIBONACCI_VALUES } from "../../shared/constants"
import type { GameState } from "./types"
import PlayerList from "./PlayerList"

interface Props {
  state: GameState
  myClientId: string
  myVote: number | "?" | null
  isSpectator: boolean
  onVote: (value: number | "?") => void
  onReveal: () => void
  onSetStory: (story: string) => void
  onLeave: () => void
}

export default function VotingScreen({ state, myClientId, myVote, isSpectator, onVote, onReveal, onSetStory, onLeave }: Props) {
  const { numericVoteCount, questionCount, totalPlayers, story, facilitatorClientId } = state
  const totalVoted = numericVoteCount + questionCount
  const isFacilitator = facilitatorClientId === myClientId
  const storyRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Clipboard API unavailable (non-secure context) — fall back to prompt
      window.prompt("Copy this link:", window.location.href)
    })
  }

  // Keep input in sync with server story only when not focused
  useEffect(() => {
    const el = storyRef.current
    if (!el || document.activeElement === el) return
    el.value = story ?? ""
  }, [story])

  const handleStoryBlur = () => {
    onSetStory(storyRef.current?.value ?? "")
  }

  const handleStoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSetStory(storyRef.current?.value ?? "")
      storyRef.current?.blur()
    }
  }

  return (
    <div style={s.layout} className="room-layout">
      <PlayerList state={state} myClientId={myClientId} />

      <main style={s.main} className="room-main">
        <div style={s.storyRow}>
          <input
            ref={storyRef}
            style={s.storyInput}
            type="text"
            placeholder="Story / ticket (optional)"
            defaultValue={story ?? ""}
            onBlur={handleStoryBlur}
            onKeyDown={handleStoryKeyDown}
            maxLength={140}
          />
        </div>

        {isSpectator ? (
          <p style={s.spectatingHint}>You're spectating — votes are hidden until revealed.</p>
        ) : (
          <div style={s.cardGrid}>
            {FIBONACCI_VALUES.map((val) => {
              const selected = myVote === val
              return (
                <button
                  key={String(val)}
                  style={{
                    ...s.card,
                    ...(selected ? s.cardSelected : {}),
                  }}
                  onClick={() => onVote(val as number | "?")}
                  aria-pressed={selected}
                >
                  {val}
                </button>
              )
            })}
          </div>
        )}

        <div style={s.footer}>
          <button style={s.copyBtn} onClick={copyLink}>
            {copied ? "Copied!" : "Copy invite link"}
          </button>
          <button style={s.leaveBtn} onClick={onLeave}>
            Change role
          </button>
          <span style={s.voteCount}>
            {totalVoted} / {totalPlayers} voted
          </span>
          {isFacilitator ? (
            <button style={s.revealBtn} onClick={onReveal}>
              Reveal votes
            </button>
          ) : (
            <span style={s.waitingHint}>Waiting for facilitator to reveal</span>
          )}
        </div>
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
    gap: 40,
    padding: "32px 48px",
    overflowY: "auto",
  },
  storyRow: {
    width: "100%",
    maxWidth: 560,
  },
  storyInput: {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #2a2d3a",
    padding: "8px 4px",
    fontSize: 18,
    fontStyle: "italic",
    color: "#ccd",
    outline: "none",
    textAlign: "center",
    transition: "border-color 0.15s",
  },
  cardGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    maxWidth: 600,
  },
  card: {
    width: 64,
    height: 90,
    background: "#1a1d27",
    border: "2px solid #2a2d3a",
    borderRadius: 10,
    color: "#e8eaf0",
    fontSize: 22,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.12s, border-color 0.12s, transform 0.1s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSelected: {
    background: "#e8eaf0",
    border: "2px solid #e8eaf0",
    color: "#0f1117",
    transform: "translateY(-4px)",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  voteCount: {
    fontSize: 14,
    color: "#666",
    fontVariantNumeric: "tabular-nums",
  },
  copyBtn: {
    padding: "10px 16px",
    background: "transparent",
    color: "#666",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
  },
  leaveBtn: {
    padding: "10px 16px",
    background: "transparent",
    color: "#555",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
  },
  spectatingHint: {
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
    textAlign: "center",
  },
  waitingHint: {
    fontSize: 13,
    color: "#555",
    fontStyle: "italic",
  },
  revealBtn: {
    padding: "12px 28px",
    background: "#4f8ef7",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
}
