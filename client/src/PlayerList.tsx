import type { GameState, PlayerView } from "./types"

interface Props {
  state: GameState
  myClientId: string
}

export default function PlayerList({ state, myClientId }: Props) {
  const { players, phase, median } = state

  return (
    <aside style={s.aside} className="player-sidebar">
      <h2 style={s.heading}>Players <span style={s.count}>{players.length}</span></h2>
      <ul style={s.list}>
        {players.map((p) => (
          <PlayerRow
            key={p.clientId}
            player={p}
            phase={phase}
            median={median}
            isMe={p.clientId === myClientId}
          />
        ))}
      </ul>
    </aside>
  )
}

function PlayerRow({
  player,
  phase,
  median,
  isMe,
}: {
  player: PlayerView
  phase: "voting" | "revealed"
  median: number | null
  isMe: boolean
}) {
  const isOutlier =
    phase === "revealed" &&
    median !== null &&
    typeof player.vote === "number" &&
    Math.abs(player.vote - median) >= 3

  const dotColor = player.isSpectator ? "#3a3d4a" : player.voted ? "#4caf50" : "#f59e0b"

  return (
    <li style={s.row}>
      <span style={{ ...s.dot, background: dotColor }} />
      <span style={{ ...s.name, color: isMe ? "#7db8f7" : "#e8eaf0" }}>
        {player.name}
        {isMe && <span style={s.youBadge}> you</span>}
        {player.isSpectator && <span style={s.spectatorBadge}> 👁</span>}
      </span>
      {!player.isSpectator && (
        <span style={{ ...s.vote, ...(isOutlier ? s.outlier : {}) }}>
          {phase === "voting"
            ? player.voted
              ? <span style={s.block}>██</span>
              : <span style={s.pending}>—</span>
            : player.vote !== null
              ? player.vote
              : <span style={s.pending}>—</span>}
        </span>
      )}
    </li>
  )
}

const s: Record<string, React.CSSProperties> = {
  aside: {
    width: 220,
    flexShrink: 0,
    background: "#161822",
    borderRight: "1px solid #2a2d3a",
    padding: "24px 16px",
    overflowY: "auto",
  },
  heading: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#666",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  count: {
    background: "#2a2d3a",
    borderRadius: 10,
    padding: "1px 7px",
    fontSize: 11,
    color: "#999",
    fontVariantNumeric: "tabular-nums",
  },
  list: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    borderRadius: 6,
    minHeight: 36,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  name: {
    fontSize: 14,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  youBadge: {
    fontSize: 10,
    color: "#666",
    fontWeight: 400,
  },
  spectatorBadge: {
    fontSize: 11,
    opacity: 0.5,
  },
  vote: {
    fontSize: 14,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    minWidth: 28,
    textAlign: "right",
    color: "#e8eaf0",
  },
  outlier: {
    color: "#f59e0b",
  },
  block: {
    color: "#444",
    letterSpacing: -2,
  },
  pending: {
    color: "#444",
    fontWeight: 400,
  },
}
