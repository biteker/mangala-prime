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
    abandonGame,
  } = useGameStore();

  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Animasyon için yerel state tanımları
  const [boardData, setBoardData] = useState<{
    board: number[];
    lastMove: LastMoveDetails | null;
  }>({ board, lastMove: null });
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  const handleForfeitClick = (): void => {
    setShowForfeitConfirm(true);
  };

  const handleForfeitConfirm = (): void => {
    setShowForfeitConfirm(false);
    abandonGame();
  };
  const prevBoardRef = useRef<number[]>(board);
  const prevPlayerIdRef = useRef<string | null>(currentPlayerId);

  // Store'daki board güncellemelerini yakalayıp animasyon adımlarını belirler
  useEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = board;

    const prevPlayerId = prevPlayerIdRef.current;
    prevPlayerIdRef.current = currentPlayerId;

    const prevTotal = prevBoard.reduce((a, b) => a + b, 0);
    const nextTotal = board.reduce((a, b) => a + b, 0);

    // Eşleşme başlangıcı, reconnect veya geçersiz durumlarda animasyon oynatmadan direkt eşitle
    if (prevTotal !== nextTotal || prevTotal === 0) {
      setBoardData({ board, lastMove: null });
      return;
    }

    // Taş kaybeden kuyu başlangıç kuyusudur.
    // Kapma (capture) durumlarında hem hamleyi başlatan kuyu hem de kapılan rakip kuyu taş kaybeder.
    // Hangisinin başlangıç kuyusu olduğunu son hamle yapan oyuncunun sırasına göre belirleriz.
    const p1PitsLosing: number[] = [];
    const p2PitsLosing: number[] = [];
    for (let i = 0; i < 6; i++) {
      if (board[i] < prevBoard[i]) {
        p1PitsLosing.push(i);
      }
    }
    for (let i = 7; i < 13; i++) {
      if (board[i] < prevBoard[i]) {
        p2PitsLosing.push(i);
      }
    }

    let lastMovePit = -1;
    if (p1PitsLosing.length > 0 && p2PitsLosing.length === 0) {
      // Sadece Player 1 kuyularından taş eksilmiş
      lastMovePit = p1PitsLosing[0];
    } else if (p2PitsLosing.length > 0 && p1PitsLosing.length === 0) {
      // Sadece Player 2 kuyularından taş eksilmiş
      lastMovePit = p2PitsLosing[0];
    } else if (p1PitsLosing.length > 0 && p2PitsLosing.length > 0) {
      // İki taraftan da taş eksilmiş (hamle başlatan kuyu + kapılan rakip kuyu)
      // Sıra kimdeyken hamle yapıldığını kontrol edip o oyuncunun kuyularına bakarız
      const wasMyTurn = currentUser ? prevPlayerId === currentUser.id : false;
      const myPitsStart = yourColor === 1 ? 7 : 0;
      const myPitsEnd = yourColor === 1 ? 12 : 5;

      if (wasMyTurn) {
        // Hamleyi ben yaptım, o halde başlangıç kuyusu benim tarafımda olmalı
        lastMovePit = p1PitsLosing.find(p => p >= myPitsStart && p <= myPitsEnd) ?? 
                      p2PitsLosing.find(p => p >= myPitsStart && p <= myPitsEnd) ?? -1;
      } else {
        // Hamleyi rakip yaptı, o halde başlangıç kuyusu rakip tarafında olmalı
        lastMovePit = p1PitsLosing.find(p => !(p >= myPitsStart && p <= myPitsEnd)) ?? 
                      p2PitsLosing.find(p => !(p >= myPitsStart && p <= myPitsEnd)) ?? -1;
      }
    }

    if (lastMovePit === -1) {
      setBoardData({ board, lastMove: null });
      return;
    }

    const startStones = prevBoard[lastMovePit];
    const steps = calculateAnimationSteps(lastMovePit, startStones);

    if (steps.length === 0) {
      setBoardData({ board, lastMove: null });
      return;
    }

    setIsAnimating(true);
    setBoardData({
      board,
      lastMove: {
        startPit: lastMovePit,
        steps,
        nextState: board
      }
    });
  }, [board]);

  const handleAnimationComplete = (): void => {
    setIsAnimating(false);
    setBoardData(prev => ({ ...prev, lastMove: null }));
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

  // Ekranı yatay (landscape) moda kilitleme girişimi (mobil cihazlar için)
  useEffect(() => {
    try {
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        window.screen.orientation.lock('landscape').catch((err) => {
          console.log('Screen orientation lock failed:', err);
        });
      }
    } catch (e) {
      // ignore
    }
    
    return () => {
      try {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

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
    if (boardData.board[pitIndex] === 0) return;

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
      if (boardData.board[i] > 0) {
        pits.push(i);
      }
    }
    return pits;
  }, [boardData.board, isMyTurn, isAnimating, yourColor]);

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
      {/* CİHAZ DÖNDÜRME UYARISI (MOBİL PORTRAIT İÇİN) */}
      <div className="orientation-warning-overlay">
        <div className="orientation-warning-card">
          <div className="orientation-warning-icon">
            <svg viewBox="0 0 24 24" width="40" height="40">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" style={{ fill: 'none', stroke: '#ff375f', strokeWidth: 2 }} />
              <circle cx="12" cy="18" r="1" style={{ fill: '#ff375f' }} />
            </svg>
          </div>
          <h3 className="orientation-warning-title">Ekranı Döndürün</h3>
          <p className="orientation-warning-text">
            Daha iyi bir Mangala deneyimi için lütfen cihazınızı yatay (landscape) konuma getirin.
          </p>
        </div>
      </div>

      {/* OYUN ÜST BARI (TRANSPARAN VE MINIMAL) */}
      <div className="game-top-bar">
        {/* Sol Oyuncu Bilgisi */}
        <div className={`top-bar-player me ${isMyTurn ? 'active-turn' : ''}`}>
          <div className="player-avatar">
            <UserIcon />
          </div>
          <div className="player-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="player-name">{currentUser.username}</span>
              {isMyTurn && <div className="active-turn-dot" title="Sıra Sizde" />}
            </div>
            <span className="player-elo">{currentUser.elo} ELO</span>
          </div>
        </div>

        {/* Orta Bölüm: Başlık ve Zamanlayıcı */}
        <div className="top-bar-center">
          <div className="game-title">Türk Mangalası</div>
          <div className={`game-timer ${turnTimeLeft <= 5 ? 'danger' : ''}`}>
            <ClockIcon />
            <span>{formatTime(turnTimeLeft)}</span>
          </div>
        </div>

        {/* Sağ Oyuncu Bilgisi */}
        <div className={`top-bar-player opponent ${!isMyTurn ? 'active-turn' : ''}`}>
          <div className="player-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!isMyTurn && <div className="active-turn-dot" title="Sıra Rakipte" />}
              <span className="player-name">{opponentUsername || 'Rakip'}</span>
            </div>
            <span className="player-elo">{opponentElo} ELO</span>
          </div>
          <div className="player-avatar">
            <UserIcon />
          </div>
        </div>
      </div>

      {/* Sol Kenardaki Oyundan Çekilme (Kapatma) Düğmesi - Referans Resimdeki Kırmızı X Butonu */}
      <button
        type="button"
        className="game-exit-btn"
        onClick={handleForfeitClick}
        title="Oyundan Çekil"
      >
        ✕
      </button>

      {/* Sağ Kenardaki Floating Sohbet Kutusu */}
      <div className="game-floating-actions">
        <label className="sohbet-acik-checkbox" title="Sohbet Durumu">
          <input
            type="checkbox"
            checked={chatEnabled}
            onChange={(e): void => toggleChat(e.target.checked)}
          />
          <span>Sohbet Açık</span>
        </label>
        <button
          type="button"
          className="action-icon-btn"
          onClick={() => {
            const chatEl = document.querySelector('.chat-panel-container');
            if (chatEl) {
              chatEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          title="Sohbete Git"
        >
          💬
        </button>
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
            boardState={boardData.board}
            isMyTurn={isMyTurn}
            clickablePits={clickablePits}
            p1Info={p1Info}
            p2Info={p2Info}
            yourColor={yourColor}
            lastMove={boardData.lastMove}
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

      {/* ÇEKİLME ONAY MODALI */}
      {showForfeitConfirm && (
        <div className="modal-backdrop">
          <div className="auth-card game-over-modal">
            <h2 className="auth-title" style={{ color: '#ff3b30' }}>Oyundan Çekil</h2>
            <p className="game-end-reason" style={{ textAlign: 'center', marginBottom: '24px' }}>
              Oyundan çekilmek istediğinize emin misiniz? Bu işlem hükmen mağlup sayılmanıza ve ELO puanınızın düşmesine neden olacaktır.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="auth-button decline-invite-btn"
                onClick={handleForfeitConfirm}
              >
                Evet, Çekil
              </button>
              <button
                type="button"
                className="auth-button accept-invite-btn"
                onClick={(): void => setShowForfeitConfirm(false)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
