"use client"

import { useState, useEffect } from "react"
import { Send, Clock, User, Trophy } from "lucide-react"

// Marble component with realistic 3D glass effect
function Marble({ color }: { color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: "marble-emerald",
    sapphire: "marble-sapphire",
    ruby: "marble-ruby",
    amber: "marble-amber",
    amethyst: "marble-amethyst",
    rose: "marble-rose",
  }

  return (
    <div
      className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${colorClasses[color]} shadow-lg relative`}
      style={{
        boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.4), inset 2px 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {/* Highlight reflection */}
      <div
        className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/50"
        style={{ filter: "blur(0.5px)" }}
      />
    </div>
  )
}

// Generate random marbles for a pit
function generateMarbles(count: number): string[] {
  const colors = ["emerald", "sapphire", "ruby", "amber", "amethyst", "rose"]
  return Array.from({ length: count }, () => colors[Math.floor(Math.random() * colors.length)])
}

// Pit component with 3D carved wood effect
function Pit({
  stones,
  marbles,
  isPlayable,
  onClick,
  isHighlighted,
}: {
  stones: number
  marbles: string[]
  isPlayable: boolean
  onClick?: () => void
  isHighlighted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!isPlayable}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full
        transition-all duration-200
        ${isPlayable ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}
        ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-wood-dark" : ""}
      `}
      style={{
        background: "radial-gradient(circle at 50% 50%, #3d2a1a 0%, #2a1d12 60%, #1a1208 100%)",
        boxShadow: `
          inset 0 4px 8px rgba(0,0,0,0.6),
          inset 0 -2px 4px rgba(139,106,66,0.3),
          0 2px 4px rgba(0,0,0,0.4)
        `,
      }}
    >
      {/* Marbles inside pit */}
      <div className="absolute inset-1 sm:inset-1.5 flex flex-wrap items-center justify-center gap-0.5 p-0.5">
        {marbles.slice(0, 6).map((color, i) => (
          <Marble key={i} color={color} />
        ))}
      </div>
      {/* Stone count badge */}
      <div
        className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground border border-primary/30"
        style={{
          boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
        }}
      >
        {stones}
      </div>
    </button>
  )
}

// Treasury component (oval vertical pit)
function Treasury({
  stones,
  marbles,
  label,
}: {
  stones: number
  marbles: string[]
  side: "left" | "right"
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div
        className="relative w-14 sm:w-16 md:w-20 h-32 sm:h-36 md:h-40 rounded-full"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, #3d2a1a 0%, #2a1d12 50%, #1a1208 100%)",
          boxShadow: `
            inset 0 6px 12px rgba(0,0,0,0.7),
            inset 0 -4px 8px rgba(139,106,66,0.3),
            0 4px 8px rgba(0,0,0,0.5)
          `,
        }}
      >
        {/* Marbles inside treasury */}
        <div className="absolute inset-2 sm:inset-3 flex flex-wrap content-end justify-center gap-0.5 p-1 overflow-hidden">
          {marbles.slice(0, 20).map((color, i) => (
            <Marble key={i} color={color} />
          ))}
        </div>
        {/* Stone count badge */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-sm font-bold"
          style={{
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        >
          {stones}
        </div>
      </div>
    </div>
  )
}

// Player badge component
function PlayerBadge({
  name,
  elo,
  isCurrentTurn,
  side,
}: {
  name: string
  elo: number
  isCurrentTurn: boolean
  side: "left" | "right"
}) {
  return (
    <div
      className={`
        flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl
        transition-all duration-300
        ${isCurrentTurn ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""}
      `}
      style={{
        background: "linear-gradient(135deg, #5c4033 0%, #4a3020 50%, #3d2518 100%)",
        boxShadow: `
          inset 0 1px 2px rgba(139,106,66,0.4),
          inset 0 -1px 2px rgba(0,0,0,0.4),
          0 4px 8px rgba(0,0,0,0.3)
        `,
      }}
    >
      <div
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #8b6a42 0%, #6d4c2a 100%)",
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <User className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
      </div>
      <div className={`flex flex-col ${side === "right" ? "items-end" : "items-start"}`}>
        <span className="text-sm sm:text-base font-semibold text-foreground">{name}</span>
        <div className="flex items-center gap-1">
          <Trophy className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium">{elo}</span>
        </div>
      </div>
      {isCurrentTurn && (
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      )}
    </div>
  )
}

// Turn timer component
function TurnTimer({ seconds, isActive }: { seconds: number; isActive: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{
        background: isActive
          ? "linear-gradient(135deg, rgba(212,168,83,0.3) 0%, rgba(212,168,83,0.1) 100%)"
          : "linear-gradient(135deg, rgba(100,100,100,0.3) 0%, rgba(100,100,100,0.1) 100%)",
        boxShadow: isActive ? "0 0 20px rgba(212,168,83,0.3)" : "none",
        border: "1px solid rgba(212,168,83,0.3)",
      }}
    >
      <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-lg sm:text-xl font-mono font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  )
}

// Chat message component
function ChatMessage({ sender, message, isMe }: { sender: string; message: string; isMe: boolean }) {
  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
      <span className="text-xs text-muted-foreground mb-1">{sender}</span>
      <div
        className={`px-3 py-2 rounded-2xl max-w-[200px] ${
          isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
        }`}
      >
        <span className="text-sm">{message}</span>
      </div>
    </div>
  )
}

// Quick message chip
function QuickMessageChip({ message, onClick }: { message: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/50 text-foreground hover:bg-secondary transition-colors border border-border/50"
    >
      {message}
    </button>
  )
}

// Chat panel component
function ChatPanel({
  messages,
  onSendMessage,
}: {
  messages: { sender: string; message: string; isMe: boolean }[]
  onSendMessage: (message: string) => void
}) {
  const [inputValue, setInputValue] = useState("")

  const quickMessages = ["Good luck!", "Nice move!", "GG!", "Thanks!", "Oops!", "Well played!"]

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue)
      setInputValue("")
    }
  }

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        background: "rgba(74, 53, 32, 0.4)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(139, 106, 66, 0.3)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border/30">
        <h3 className="font-semibold text-foreground">Live Chat</h3>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px] lg:max-h-none">
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
      </div>

      {/* Quick messages */}
      <div className="px-4 py-2 border-t border-border/30">
        <div className="flex flex-wrap gap-2">
          {quickMessages.map((msg) => (
            <QuickMessageChip key={msg} message={msg} onClick={() => onSendMessage(msg)} />
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-secondary/50 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Mangala Board component
function MangalaBoard({
  gameState,
  currentPlayer,
  onPitClick,
}: {
  gameState: { playerPits: number[]; opponentPits: number[]; playerTreasury: number; opponentTreasury: number }
  currentPlayer: 1 | 2
  onPitClick: (pitIndex: number, isPlayer: boolean) => void
}) {
  const [playerMarbles, setPlayerMarbles] = useState<string[][]>([])
  const [opponentMarbles, setOpponentMarbles] = useState<string[][]>([])
  const [playerTreasuryMarbles, setPlayerTreasuryMarbles] = useState<string[]>([])
  const [opponentTreasuryMarbles, setOpponentTreasuryMarbles] = useState<string[]>([])

  useEffect(() => {
    setPlayerMarbles(gameState.playerPits.map((count) => generateMarbles(count)))
    setOpponentMarbles(gameState.opponentPits.map((count) => generateMarbles(count)))
    setPlayerTreasuryMarbles(generateMarbles(gameState.playerTreasury))
    setOpponentTreasuryMarbles(generateMarbles(gameState.opponentTreasury))
  }, [gameState])

  return (
    <div
      className="relative p-3 sm:p-4 md:p-6 rounded-3xl"
      style={{
        background: "linear-gradient(145deg, #7a5c3a 0%, #5c4028 30%, #4a3020 60%, #3d2518 100%)",
        boxShadow: `
          inset 0 2px 4px rgba(139,106,66,0.5),
          inset 0 -2px 4px rgba(0,0,0,0.4),
          0 10px 40px rgba(0,0,0,0.5),
          0 4px 8px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Wood grain texture overlay */}
      <div
        className="absolute inset-0 rounded-3xl opacity-10 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.1) 2px,
            rgba(0,0,0,0.1) 4px
          )`,
        }}
      />

      {/* Board layout */}
      <div className="relative flex items-center gap-2 sm:gap-3 md:gap-4">
        {/* Left Treasury (Opponent) */}
        <Treasury
          stones={gameState.opponentTreasury}
          marbles={opponentTreasuryMarbles}
          side="left"
          label="P2"
        />

        {/* Center Pits Grid */}
        <div className="flex-1 flex flex-col gap-3 sm:gap-4 md:gap-6">
          {/* Opponent pits (top row - right to left) */}
          <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3">
            {gameState.opponentPits.map((stones, i) => (
              <Pit
                key={`opponent-${i}`}
                stones={stones}
                marbles={opponentMarbles[i] || []}
                isPlayable={currentPlayer === 2 && stones > 0}
                onClick={() => onPitClick(i, false)}
                isHighlighted={currentPlayer === 2 && stones > 0}
              />
            ))}
          </div>

          {/* Player pits (bottom row - left to right) */}
          <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3">
            {gameState.playerPits.map((stones, i) => (
              <Pit
                key={`player-${i}`}
                stones={stones}
                marbles={playerMarbles[i] || []}
                isPlayable={currentPlayer === 1 && stones > 0}
                onClick={() => onPitClick(i, true)}
                isHighlighted={currentPlayer === 1 && stones > 0}
              />
            ))}
          </div>
        </div>

        {/* Right Treasury (Player) */}
        <Treasury
          stones={gameState.playerTreasury}
          marbles={playerTreasuryMarbles}
          side="right"
          label="P1"
        />
      </div>
    </div>
  )
}

// Main game page component
export default function MangalaGame() {
  const [timer, setTimer] = useState(45)
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1)
  const [gameState, setGameState] = useState({
    playerPits: [4, 4, 4, 4, 4, 4],
    opponentPits: [4, 4, 4, 4, 4, 4],
    playerTreasury: 0,
    opponentTreasury: 0,
  })
  const [messages, setMessages] = useState([
    { sender: "System", message: "Game started! Good luck!", isMe: false },
    { sender: "MasterGamer", message: "Good luck!", isMe: false },
  ])

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 45))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handlePitClick = (pitIndex: number, isPlayer: boolean) => {
    if ((isPlayer && currentPlayer !== 1) || (!isPlayer && currentPlayer !== 2)) return

    const pits = isPlayer ? [...gameState.playerPits] : [...gameState.opponentPits]
    const stones = pits[pitIndex]
    if (stones === 0) return

    pits[pitIndex] = 0
    // Simple distribution logic (basic version)
    let currentPit = pitIndex
    let remaining = stones
    const newPlayerPits = isPlayer ? pits : [...gameState.playerPits]
    const newOpponentPits = isPlayer ? [...gameState.opponentPits] : pits
    let playerTreasury = gameState.playerTreasury
    let opponentTreasury = gameState.opponentTreasury

    while (remaining > 0) {
      currentPit++
      if (currentPit > 5) {
        if (isPlayer) {
          playerTreasury++
          remaining--
          if (remaining === 0) {
            // Extra turn
            setTimer(45)
            setGameState({ ...gameState, playerPits: newPlayerPits, opponentPits: newOpponentPits, playerTreasury, opponentTreasury })
            return
          }
        }
        currentPit = 0
        if (remaining > 0) {
          if (isPlayer) {
            newOpponentPits[5 - currentPit]++
          } else {
            newPlayerPits[currentPit]++
          }
          remaining--
        }
      } else {
        if (isPlayer) {
          newPlayerPits[currentPit]++
        } else {
          newOpponentPits[currentPit]++
        }
        remaining--
      }
    }

    setGameState({ playerPits: newPlayerPits, opponentPits: newOpponentPits, playerTreasury, opponentTreasury })
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1)
    setTimer(45)
  }

  const handleSendMessage = (message: string) => {
    setMessages((prev) => [...prev, { sender: "You", message, isMe: true }])
  }

  return (
    <main
      className="min-h-screen p-4 sm:p-6"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #243252 0%, #1a2744 50%, #131d33 100%)`,
      }}
    >
      {/* Header Panel */}
      <header className="max-w-6xl mx-auto mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Player 1 (Me) */}
          <PlayerBadge name="You" elo={1847} isCurrentTurn={currentPlayer === 1} side="left" />

          {/* Turn Timer */}
          <TurnTimer seconds={timer} isActive={true} />

          {/* Player 2 (Opponent) */}
          <PlayerBadge name="MasterGamer" elo={1923} isCurrentTurn={currentPlayer === 2} side="right" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Chat Panel - On top for mobile, left for desktop */}
          <div className="lg:w-80 order-2 lg:order-1">
            <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
          </div>

          {/* Mangala Board - Main focus */}
          <div className="flex-1 flex items-center justify-center order-1 lg:order-2">
            <MangalaBoard
              gameState={gameState}
              currentPlayer={currentPlayer}
              onPitClick={handlePitClick}
            />
          </div>
        </div>
      </div>

      {/* Turn indicator for mobile */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:hidden">
        <div
          className="px-4 py-2 rounded-full text-sm font-medium"
          style={{
            background: "rgba(74, 53, 32, 0.9)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(212,168,83,0.3)",
          }}
        >
          {currentPlayer === 1 ? (
            <span className="text-primary">Your turn</span>
          ) : (
            <span className="text-muted-foreground">{"Opponent's turn"}</span>
          )}
        </div>
      </div>
    </main>
  )
}
