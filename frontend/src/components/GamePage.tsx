import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/game.store';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from '../lib/router';

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

  // Otomatik sayfa yönlendirme ve bağlantı yönetimi
  // Not: React StrictMode geliştirme modunda effect'i iki kez çalıştırır.
  // connectGame guard'ı (socket && matchId === matchId) sayesinde çift soket oluşmaz.
  // disconnectGame ise ancak matchId gerçekten null olduğunda lobiye döner.
  useEffect(() => {
    if (!matchId) {
      navigate('#/lobby');
      return;
    }
    connectGame(matchId);
    // Cleanup: sadece bileşen gerçekten unmount edildiğinde çalışır.
    // game:game_over alındığında kullanıcı "Lobiye Dön" butonuna basar,
    // bu da disconnectGame + navigate çağırır — burada tekrar çağırmaya gerek yok.
    return () => {
      // intentionally empty — disconnectGame is called by the "Lobiye Dön" button
      // or when matchId becomes null (handled above).
    };
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

  // Kuyularda görsel taş dağılımı için yardımcı fonksiyon
  const renderStones = (count: number): React.ReactNode => {
    const maxDots = 6;
    const dotsCount = Math.min(count, maxDots);
    const dots = Array.from({ length: dotsCount }).map((_, i) => (
      <span key={i} className="stone-dot"></span>
    ));

    return (
      <div className="stone-dots-container">
        {dots}
        {count > maxDots && <span className="stone-more-text">+{count - maxDots}</span>}
      </div>
    );
  };

  // Kuyu tıklama işleyicisi
  const handlePitClick = (pitIndex: number): void => {
    if (!isMyTurn) return;

    // Sadece kendi kuyularımıza tıklayabiliriz
    const isMyPit =
      yourColor === 0
        ? pitIndex >= 0 && pitIndex <= 5
        : pitIndex >= 7 && pitIndex <= 12;

    if (!isMyPit) return;
    if (board[pitIndex] === 0) return;

    makeMove(pitIndex);
  };

  // Rotaların Eşleştirilmesi (Perspektife Göre Sıralama)
  // yourColor === 0 (Player 1) ise:
  // - Üst Sıra: 12, 11, 10, 9, 8, 7 (Rakip)
  // - Alt Sıra: 0, 1, 2, 3, 4, 5 (Biz)
  // - Sol Hazine: 13 (Rakip)
  // - Sağ Hazine: 6 (Biz)
  //
  // yourColor === 1 (Player 2) ise:
  // - Üst Sıra: 5, 4, 3, 2, 1, 0 (Rakip)
  // - Alt Sıra: 7, 8, 9, 10, 11, 12 (Biz)
  // - Sol Hazine: 6 (Rakip)
  // - Sağ Hazine: 13 (Biz)
  const topPits = yourColor === 1 ? [5, 4, 3, 2, 1, 0] : [12, 11, 10, 9, 8, 7];
  const bottomPits = yourColor === 1 ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5];
  const leftTreasuryIndex = yourColor === 1 ? 6 : 13;
  const rightTreasuryIndex = yourColor === 1 ? 13 : 6;

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
          <span className="player-role-indicator">P{yourColor === 0 ? '1' : '2'} (Siz)</span>
          <span className="player-username">{currentUser.username}</span>
          <span className="player-elo-info">{currentUser.elo} ELO</span>
        </div>

        <div className="timer-panel">
          <span className="timer-label">SÜRE</span>
          <span className={`timer-seconds ${turnTimeLeft <= 5 ? 'danger' : ''}`}>
            {turnTimeLeft}s
          </span>
          <span className="turn-status-text">
            {isMyTurn ? 'Sıra Sizde!' : 'Rakibin Hamlesi Bekleniyor...'}
          </span>
        </div>

        <div className="player-badge opponent">
          <span className="player-role-indicator">P{yourColor === 0 ? '2' : '1'}</span>
          <span className="player-username">{opponentUsername || 'Rakip'}</span>
          <span className="player-elo-info">{opponentElo} ELO</span>
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
              Gönder
            </button>
          </form>
        </div>

        {/* ORTA PANEL: MANGALA TAHTASI */}
        <div className="board-panel-container">
          <div className="mangala-board">
            {/* SOL HAZNE (Rakip Haznesi) */}
            <div className="treasury left-treasury">
              <span className="treasury-label">P{yourColor === 1 ? '1' : '2'}</span>
              <span className="stone-count">{board[leftTreasuryIndex]}</span>
              {renderStones(board[leftTreasuryIndex])}
            </div>

            {/* ORTA 12 KUYU BÖLGESİ */}
            <div className="pits-grid">
              {/* ÜST SIRA (Rakip Kuyuları - Ters Perspektif) */}
              <div className="pits-row top-row">
                {topPits.map((pitIdx) => {
                  return (
                    <div key={pitIdx} className="pit top-pit disabled">
                      <span className="pit-index-label">{pitIdx}</span>
                      <span className="stone-count">{board[pitIdx]}</span>
                      {renderStones(board[pitIdx])}
                    </div>
                  );
                })}
              </div>

              {/* ALT SIRA (Kendi Kuyularımız - Tıklanabilir) */}
              <div className="pits-row bottom-row">
                {bottomPits.map((pitIdx) => {
                  const hasStones = board[pitIdx] > 0;
                  const canClick = isMyTurn && hasStones;
                  return (
                    <div
                      key={pitIdx}
                      className={`pit bottom-pit ${canClick ? 'active' : 'disabled'}`}
                      onClick={(): void => handlePitClick(pitIdx)}
                    >
                      <span className="pit-index-label">{pitIdx}</span>
                      <span className="stone-count">{board[pitIdx]}</span>
                      {renderStones(board[pitIdx])}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SAĞ HAZNE (Bizim Haznemiz) */}
            <div className="treasury right-treasury">
              <span className="treasury-label">P{yourColor === 0 ? '1' : '2'} (Siz)</span>
              <span className="stone-count">{board[rightTreasuryIndex]}</span>
              {renderStones(board[rightTreasuryIndex])}
            </div>
          </div>
        </div>
      </div>

      {/* OYUN SONU MODALI */}
      {gameOverDetails && (
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
