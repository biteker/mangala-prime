import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../stores/game.store';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from '../lib/router';
import { MangalaReactBoard } from './MangalaBoard/MangalaReactBoard';
import type { LastMoveDetails } from './MangalaBoard/MangalaReactBoard';

// SVG Icon components for premium feel
const UserIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const TrophyIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a15.3 15.3 0 0 1 4 7H8a15.3 15.3 0 0 1 4-7z" />
  </svg>
);

const ClockIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SendIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// Saat yönünün tersine taş dağıtım rotasını hesaplar (Rakip haznesini atlar)
function calculateAnimationSteps(startPit: number, stoneCount: number): number[] {
  const steps: number[] = [];
  if (stoneCount <= 0) return steps;

  const movingPlayer = startPit >= 0 && startPit <= 5 ? 0 : 1;
  const opponentTreasury = movingPlayer === 0 ? 13 : 6;

  if (stoneCount === 1) {
    let next = (startPit + 1) % 14;
    if (next === opponentTreasury) {
      next = (next + 1) % 14;
    }
    steps.push(next);
  } else {
    // Çoklu taş kuralında ilk taş kendi kuyusuna bırakılır
    steps.push(startPit);
    let current = startPit;
    let stonesLeft = stoneCount - 1;
    while (stonesLeft > 0) {
      current = (current + 1) % 14;
      if (current === opponentTreasury) {
        continue;
      }
      steps.push(current);
      stonesLeft--;
    }
  }
  return steps;
}

export function GamePage(): React.JSX.Element {
  const { navigate } = useRouter();
  const currentUser = useAuthStore((state) => state.user);

  const {
    matchId,
    board,
    currentPlayerId,
    turnTimeLeft,
    opponentUsername,
    opponentElo,
    yourColor,
    chatEnabled,
    messages,
    gameError,
    gameOverDetails,
    disconnectedPlayerId,
    reconnectWindowSecs,
    connectGame,
    disconnectGame,
    makeMove,
    sendChatMessage,
    toggleChat,
  } = useGameStore();

  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Animasyon için yerel state tanımları
  const [lastMove, setLastMove] = useState<LastMoveDetails | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const prevBoardRef = useRef<number[]>(board);

  // Store'daki board güncellemelerini yakalayıp animasyon adımlarını belirler
  useEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = board;

    const prevTotal = prevBoard.reduce((a, b) => a + b, 0);
    const nextTotal = board.reduce((a, b) => a + b, 0);

    // Eşleşme başlangıcı, reconnect veya geçersiz durumlarda animasyon oynatmadan direkt eşitle
    if (prevTotal !== nextTotal || prevTotal === 0) {
      setLastMove(null);
      return;
    }

    // Taş kaybeden kuyu başlangıç kuyusudur
    let lastMovePit = -1;
    for (let i = 0; i < 14; i++) {
      if (i === 6 || i === 13) continue;
      if (board[i] < prevBoard[i]) {
        lastMovePit = i;
        break;
      }
    }

    if (lastMovePit === -1) {
      setLastMove(null);
      return;
    }

    const startStones = prevBoard[lastMovePit];
    const steps = calculateAnimationSteps(lastMovePit, startStones);

    if (steps.length === 0) {
      setLastMove(null);
      return;
    }

    setIsAnimating(true);
    setLastMove({
      startPit: lastMovePit,
      steps,
      nextState: board
    });
  }, [board]);

  const handleAnimationComplete = (): void => {
    setIsAnimating(false);
    setLastMove(null);
  };

  // Oyun sonu modalını animasyon tamamlanana kadar erteleyen mekanizma
  useEffect(() => {
    if (gameOverDetails && !isAnimating) {
      setShowGameOverModal(true);
    } else if (!gameOverDetails) {
      setShowGameOverModal(false);
    }
  }, [gameOverDetails, isAnimating]);

  // Otomatik sayfa yönlendirme ve bağlantı yönetimi
  useEffect(() => {
    if (!matchId) {
      navigate('#/lobby');
      return;
    }
    connectGame(matchId);
  }, [matchId, connectGame, navigate]);

  // Yeni mesaj geldiğinde sohbeti aşağı kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentUser) {
    return <div className="auth-card">Yükleniyor...</div>;
  }

  const isMyTurn = currentPlayerId === currentUser.id;

  // Hazır (preset) mesajlar listesi
  const PRESET_MESSAGES = [
    'Kolay gelsin!',
    'İyi şanslar!',
    'Güzel hamle!',
    'Hata yaptım!',
    'Teşekkürler!',
    'Tebrikler!',
  ];

  const handleSendCustomMessage = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim(), 'text');
    setChatInput('');
  };

  const handleSendPresetMessage = (preset: string): void => {
    sendChatMessage(preset, 'preset');
  };

  // Kuyu tıklama işleyicisi
  const handlePitClick = (pitIndex: number): void => {
    if (isAnimating || !isMyTurn) return;

    // Sadece kendi kuyularımıza tıklayabiliriz
    const isMyPit =
      yourColor === 0
        ? pitIndex >= 0 && pitIndex <= 5
        : pitIndex >= 7 && pitIndex <= 12;

    if (!isMyPit) return;
    if (board[pitIndex] === 0) return;

    makeMove(pitIndex);
  };

  // Tıklanabilir kuyular dizisi
  const clickablePits = useMemo(() => {
    if (!isMyTurn || isAnimating) return [];
    const isP1 = yourColor === 0;
    const startIdx = isP1 ? 0 : 7;
    const endIdx = isP1 ? 5 : 12;
    const pits: number[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      if (board[i] > 0) {
        pits.push(i);
      }
    }
    return pits;
  }, [board, isMyTurn, isAnimating, yourColor]);

  // Oyuncu Bilgileri Eşleştirmesi
  const p1Info = useMemo(() => {
    if (yourColor === 0) {
      return { name: currentUser.username, elo: currentUser.elo };
    } else {
      return { name: opponentUsername || 'Rakip', elo: opponentElo || 1000 };
    }
  }, [yourColor, currentUser, opponentUsername, opponentElo]);

  const p2Info = useMemo(() => {
    if (yourColor === 1) {
      return { name: currentUser.username, elo: currentUser.elo };
    } else {
      return { name: opponentUsername || 'Rakip', elo: opponentElo || 1000 };
    }
  }, [yourColor, currentUser, opponentUsername, opponentElo]);

  // ELO Değişimi Hesaplama (modal için)
  const myEloChange = (): number => {
    if (!gameOverDetails) return 0;
    return yourColor === 0 ? gameOverDetails.p1EloChange : gameOverDetails.p2EloChange;
  };

  const getEndReasonText = (reason: string): string => {
    switch (reason) {
      case 'NORMAL':
        return 'Tüm kuyular boşaldı ve oyun tamamlandı.';
      case 'TIMEOUT':
        return 'Sıradaki oyuncunun hamle yapma süresi (15 saniye) doldu.';
      case 'DISCONNECT':
        return 'Rakip oyuncunun bağlantısı koptu ve geri dönmedi.';
      case 'FORFEIT':
        return 'Bir oyuncu oyundan çekildi.';
      default:
        return 'Oyun tamamlandı.';
    }
  };

  return (
    <div className="game-layout">
      {/* OYUN HEADER BİLGİSİ */}
      <div className="game-header-panel">
        <div className="player-badge me">
          <div className="player-avatar">
            <UserIcon />
          </div>
          <div className="player-info">
            <span className="player-username">{currentUser.username}</span>
            <div className="player-elo-container">
              <TrophyIcon />
              <span className="player-elo-info">{currentUser.elo}</span>
            </div>
          </div>
          {isMyTurn && <div className="active-turn-dot" />}
        </div>

        <div className="timer-panel">
          <ClockIcon />
          <span className={`timer-seconds ${turnTimeLeft <= 5 ? 'danger' : ''}`}>
            {formatTime(turnTimeLeft)}
          </span>
          <span className="turn-status-text">
            {isMyTurn ? 'Sıra Sizde!' : 'Sıra Rakipte'}
          </span>
        </div>

        <div className="player-badge opponent">
          <div className="player-avatar">
            <UserIcon />
          </div>
          <div className="player-info">
            <span className="player-username">{opponentUsername || 'Rakip'}</span>
            <div className="player-elo-container">
              <TrophyIcon />
              <span className="player-elo-info">{opponentElo}</span>
            </div>
          </div>
          {!isMyTurn && <div className="active-turn-dot" />}
        </div>
      </div>

      {disconnectedPlayerId && (
        <div className="auth-error-alert connection-lost-alert">
          Rakip oyuncunun bağlantısı kesildi. Yeniden bağlanması için geriye sayım:{' '}
          <strong>{reconnectWindowSecs} saniye</strong>.
        </div>
      )}

      {gameError && <div className="auth-error-alert game-alert">{gameError}</div>}

      <div className="game-content-container">
        {/* SOL PANEL: CHAT */}
        <div className="chat-panel-container">
          <div className="chat-header">
            <h4>Canlı Sohbet</h4>
            <label className="chat-toggle-label">
              <input
                type="checkbox"
                checked={chatEnabled}
                onChange={(e): void => toggleChat(e.target.checked)}
              />
              Sohbeti Aç
            </label>
          </div>

          <div className="chat-messages-box">
            {messages.length === 0 ? (
              <p className="no-messages-text">Sohbeti başlatmak için bir şeyler yazın.</p>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={`chat-bubble-wrapper ${m.sender}`}>
                  <div className={`chat-bubble ${m.type}`}>
                    <span className="bubble-sender-name">
                      {m.sender === 'me' ? 'Siz' : opponentUsername || 'Rakip'}
                    </span>
                    <span className="bubble-text">{m.message}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-presets">
            {PRESET_MESSAGES.map((msg, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-msg-btn"
                disabled={!chatEnabled}
                onClick={(): void => handleSendPresetMessage(msg)}
              >
                {msg}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendCustomMessage} className="chat-input-form">
            <input
              type="text"
              placeholder={chatEnabled ? 'Mesaj yazın...' : 'Sohbet devre dışı.'}
              className="form-input chat-input"
              value={chatInput}
              onChange={(e): void => setChatInput(e.target.value)}
              disabled={!chatEnabled}
            />
            <button type="submit" className="auth-button chat-send-btn" disabled={!chatEnabled}>
              <SendIcon />
            </button>
          </form>
        </div>

        {/* ORTA PANEL: MANGALA TAHTASI */}
        <div className="board-panel-container">
          <MangalaReactBoard
            boardState={board}
            isMyTurn={isMyTurn}
            clickablePits={clickablePits}
            p1Info={p1Info}
            p2Info={p2Info}
            lastMove={lastMove}
            onPitClicked={handlePitClick}
            onAnimationComplete={handleAnimationComplete}
          />
        </div>
      </div>

      {/* Mobilde ekranın altında sırayı gösteren indicator */}
      <div className="mobile-turn-indicator-container">
        <div className={`mobile-turn-indicator ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
          {isMyTurn ? 'Sıra Sizde' : 'Sıra Rakipte'}
        </div>
      </div>

      {/* OYUN SONU MODALI */}
      {showGameOverModal && gameOverDetails && (
        <div className="modal-backdrop">
          <div className="auth-card game-over-modal">
            <h2 className="auth-title">Oyun Bitti</h2>

            {gameOverDetails.winnerId === currentUser.id ? (
              <div className="game-result-title win">Tebrikler, Kazandınız! 🎉</div>
            ) : !gameOverDetails.winnerId ? (
              <div className="game-result-title draw">Oyun Berabere! 🤝</div>
            ) : (
              <div className="game-result-title lose">Kaybettiniz... 😢</div>
            )}

            <p className="game-end-reason">
              {getEndReasonText(gameOverDetails.reason)}
            </p>

            <div className="elo-change-panel">
              <span className="elo-change-label">ELO Dereceniz:</span>
              <span className={`elo-change-value ${myEloChange() >= 0 ? 'positive' : 'negative'}`}>
                {myEloChange() >= 0 ? `+${myEloChange()}` : myEloChange()} ELO
              </span>
            </div>

            <button
              type="button"
              className="auth-button return-lobby-btn"
              onClick={(): void => {
                disconnectGame();
                navigate('#/lobby');
              }}
            >
              Lobiye Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
