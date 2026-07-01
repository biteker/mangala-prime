import React, { useState, useEffect, useRef } from 'react';
import { useLobbyStore } from '../stores/lobby.store';
import { useAuthStore } from '../stores/auth.store';

export function LobbyPage(): React.JSX.Element {
  const currentUser = useAuthStore((state) => state.user);
  
  const {
    onlineUsers,
    isInQueue,
    incomingInvite,
    outgoingInviteTargetId,
    inviteError,
    connectLobby,
    disconnectLobby,
    joinQueue,
    leaveQueue,
    sendInvite,
    respondToInvite,
  } = useLobbyStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [queueSeconds, setQueueSeconds] = useState(120);
  const [inviteSeconds, setInviteSeconds] = useState(30);

  const queueIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inviteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lobiye bağlanma ve ayrılma yönetimi
  useEffect(() => {
    connectLobby();
    useAuthStore.getState().fetchMe().catch(() => {});
    return () => {
      disconnectLobby();
    };
  }, [connectLobby, disconnectLobby]);

  // Eşleşme sırası sayacı
  useEffect(() => {
    if (isInQueue) {
      setQueueSeconds(120);
      queueIntervalRef.current = setInterval(() => {
        setQueueSeconds((prev) => {
          if (prev <= 1) {
            if (queueIntervalRef.current) {
              clearInterval(queueIntervalRef.current);
              queueIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (queueIntervalRef.current) {
        clearInterval(queueIntervalRef.current);
        queueIntervalRef.current = null;
      }
    }

    return () => {
      if (queueIntervalRef.current) {
        clearInterval(queueIntervalRef.current);
      }
    };
  }, [isInQueue]);

  // Meydan okuma (giden davet) sayacı
  useEffect(() => {
    if (outgoingInviteTargetId) {
      setInviteSeconds(30);
      inviteIntervalRef.current = setInterval(() => {
        setInviteSeconds((prev) => {
          if (prev <= 1) {
            if (inviteIntervalRef.current) {
              clearInterval(inviteIntervalRef.current);
              inviteIntervalRef.current = null;
            }
            // 30 saniye dolduğunda yerel durumu temizle
            useLobbyStore.setState({ outgoingInviteTargetId: null });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (inviteIntervalRef.current) {
        clearInterval(inviteIntervalRef.current);
        inviteIntervalRef.current = null;
      }
    }

    return () => {
      if (inviteIntervalRef.current) {
        clearInterval(inviteIntervalRef.current);
      }
    };
  }, [outgoingInviteTargetId]);

  // Kendi kullanıcımızı listeden çıkar
  const filteredUsers = (onlineUsers || []).filter(
    (u) =>
      u &&
      u.userId !== currentUser?.id &&
      u.username &&
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Davet edilen oyuncunun ismini bul
  const challengedUser = onlineUsers.find((u) => u.userId === outgoingInviteTargetId);
  // Davet eden oyuncunun ismini bul
  const inviterUser = onlineUsers.find((u) => u.userId === incomingInvite?.inviterUserId);

  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleCancelInvite = (): void => {
    useLobbyStore.setState({ outgoingInviteTargetId: null });
  };

  return (
    <div className="lobby-layout">
      {/* MATCHMAKING & DASHBOARD ALANI */}
      <div className="lobby-main">
        <div className="dashboard-card">
          <h2 className="dashboard-title">Hızlı Eşleşme</h2>
          <p className="dashboard-desc">
            Mangala Prime havuzundaki diğer oyuncularla anında eşleşmek için sıraya girin.
          </p>

          {!isInQueue ? (
            <button
              type="button"
              className="auth-button start-queue-btn"
              onClick={joinQueue}
            >
              Hızlı Maç Bul
            </button>
          ) : (
            <div className="queue-active-container">
              <div className="queue-spinner-ring">
                <div className="ring-pulse"></div>
                <span className="queue-timer-text">{formatTime(queueSeconds)}</span>
              </div>
              <p className="queue-status-text">Rakip aranıyor, lütfen bekleyin...</p>
              <button
                type="button"
                className="auth-button cancel-queue-btn"
                onClick={leaveQueue}
              >
                Sıradan Çık
              </button>
            </div>
          )}
        </div>

        {/* Hata Bildirimleri */}
        {inviteError && (
          <div className="auth-error-alert lobby-alert">
            <strong>Hata:</strong> {inviteError.message}
            <button
              type="button"
              className="alert-close-btn"
              onClick={(): void => useLobbyStore.setState({ inviteError: null })}
            >
              ×
            </button>
          </div>
        )}

        {/* Nasıl Oynanır Kartı (Premium İçerik) */}
        <div className="info-card">
          <h3>Mangala Kuralları</h3>
          <ul>
            <li>Her oyuncunun bölgesinde 6 kuyu ve sağında 1 haznesi bulunur.</li>
            <li>Kendi kuyunuzdan aldığınız taşları saat yönünün tersine dağıtırsınız.</li>
            <li>Son taş haznenize gelirse bir hamle hakkı daha kazanırsınız.</li>
            <li>Son taş rakip kuyuya gelirse ve kuyu çiftlenirse, kuyudaki tüm taşları haznenize alırsınız.</li>
            <li>Son taş boş kuyunuza gelirse, karşı kuyudaki taşlarla birlikte kendi haznenize alırsınız (Turan taktiği).</li>
          </ul>
        </div>
      </div>

      {/* ONLINE OYUNCULAR LISTESI (SIDEBAR) */}
      <div className="lobby-sidebar">
        <div className="sidebar-card">
          <h3 className="sidebar-title">Aktif Oyuncular ({filteredUsers.length})</h3>
          
          <input
            type="text"
            className="form-input sidebar-search"
            placeholder="Oyuncu ara..."
            value={searchQuery}
            onChange={(e): void => setSearchQuery(e.target.value)}
          />

          <div className="online-list">
            {filteredUsers.length === 0 ? (
              <p className="no-users-text">Aktif oyuncu bulunamadı.</p>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.userId} className="online-user-item">
                  <div className="user-info">
                    <span className="user-name">{u.username}</span>
                    <span className="user-elo">{u.elo} ELO</span>
                  </div>
                  <div className="user-action">
                    <span className={`status-badge ${u.status}`}>
                      {u.status === 'playing' ? 'Derste' : 'Lobi'}
                    </span>
                    <button
                      type="button"
                      className="challenge-btn"
                      disabled={u.status === 'playing' || isInQueue || !!outgoingInviteTargetId}
                      onClick={(): void => sendInvite(u.userId)}
                    >
                      Meydan Oku
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* GİDEN DAVET MODALI (BEKLEME EKRANI) */}
      {outgoingInviteTargetId && (
        <div className="modal-backdrop">
          <div className="auth-card invite-modal">
            <h3 className="auth-title">Meydan Okundu</h3>
            <p className="invite-desc">
              <strong>{challengedUser?.username || 'Oyuncu'}</strong> kullanıcısına meydan okundu. Yanıt bekleniyor...
            </p>
            <div className="invite-timer-ring">
              <span className="invite-countdown">{inviteSeconds}</span>
            </div>
            <button
              type="button"
              className="auth-button cancel-queue-btn"
              onClick={handleCancelInvite}
            >
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* GELEN DAVET MODALI (MEYDAN OKUMA GELDİ) */}
      {incomingInvite && (
        <div className="modal-backdrop">
          <div className="auth-card invite-modal">
            <h3 className="auth-title">Meydan Okuma!</h3>
            <p className="invite-desc">
              <strong>{inviterUser?.username || 'Bir oyuncu'}</strong> size meydan okuyor! Kabul ediyor musunuz?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="auth-button accept-invite-btn"
                onClick={(): void => respondToInvite(incomingInvite.inviterUserId, true)}
              >
                Kabul Et
              </button>
              <button
                type="button"
                className="auth-button decline-invite-btn"
                onClick={(): void => respondToInvite(incomingInvite.inviterUserId, false)}
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
