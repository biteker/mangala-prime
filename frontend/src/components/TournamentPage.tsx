import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  TournamentSummary,
  TournamentDetailResponse,
  TournamentMatchAssignedPayload,
  TournamentUpdatedPayload,
  PairingResult,
} from '@mangala/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth.store';
import { useGameStore } from '../stores/game.store';
import { useRouter } from '../lib/router';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  REGISTRATION: 'Kayıt Açık',
  CHECK_IN: 'Yoklama (Check-in)',
  IN_PROGRESS: 'Devam Ediyor',
  FINISHED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

const RESULT_LABELS: Record<PairingResult, string> = {
  PENDING: 'Oynanıyor...',
  P1_WIN: '1. Oyuncu Kazandı',
  P2_WIN: '2. Oyuncu Kazandı',
  DRAW: 'Berabere',
  BYE: 'BAY (+1)',
  NO_SHOW_P1: '1. Oyuncu Gelmedi (Hükmen)',
  NO_SHOW_P2: '2. Oyuncu Gelmedi (Hükmen)',
};

export function TournamentPage(): React.JSX.Element {
  const { navigate } = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [schoolFilter, setSchoolFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TournamentDetailResponse | null>(null);
  const [projectionMode, setProjectionMode] = useState<boolean>(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Join by code form
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [classLabelInput, setClassLabelInput] = useState<string>('');

  // Create tournament form (TEACHER / ADMIN)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>('');
  const [createSchool, setCreateSchool] = useState<string>(user?.schoolName ?? '');
  const [createRounds, setCreateRounds] = useState<number>(5);
  const [createSets, setCreateSets] = useState<1 | 2>(2);
  const [createTurnSecs, setCreateTurnSecs] = useState<number>(59);
  const [createAffectsElo, setCreateAffectsElo] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const canCreate = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const canManageSelected = Boolean(
    detail &&
      user &&
      (user.role === 'ADMIN' ||
        (user.role === 'TEACHER' && detail.createdById === user.id)),
  );

  const clearAlerts = (): void => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const loadList = useCallback(async (school?: string): Promise<void> => {
    try {
      const list = await apiClient.get<never, TournamentSummary[]>('/tournaments', {
        params: school?.trim() ? { schoolName: school.trim() } : undefined,
      });
      setTournaments(list);
    } catch {
      setErrorMessage('Turnuva listesi yüklenemedi.');
    }
  }, []);

  const loadDetail = useCallback(async (id: string): Promise<void> => {
    try {
      const loaded = await apiClient.get<never, TournamentDetailResponse>(
        `/tournaments/${id}`,
      );
      setDetail(loaded);
    } catch {
      setErrorMessage('Turnuva detayları yüklenemedi.');
    }
  }, []);

  // Initial list load & restore last active tournament
  useEffect(() => {
    let cancelled = false;
    const init = async (): Promise<void> => {
      try {
        const list = await apiClient.get<never, TournamentSummary[]>('/tournaments');
        if (!cancelled) {
          setTournaments(list);
          const storedId = window.localStorage.getItem('activeTournamentId');
          const matchedStored = storedId
            ? list.find((item) => item.id === storedId)
            : undefined;
          const fallbackActive = list.find(
            (item) =>
              item.status === 'IN_PROGRESS' ||
              item.status === 'CHECK_IN' ||
              item.status === 'REGISTRATION',
          );
          const autoTarget = matchedStored ?? fallbackActive;
          if (autoTarget) {
            setSelectedId(autoTarget.id);
            await loadDetail(autoTarget.id);
          }
        }
      } catch {
        if (!cancelled) {
          setErrorMessage('Turnuva listesi yüklenemedi.');
        }
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [loadDetail]);

  // Tournament WebSocket connection for live updates & auto match routing
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${API_BASE}/tournament`, {
      auth: { token: accessToken },
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('tournament:updated', (payload: TournamentUpdatedPayload) => {
      if (selectedId && payload.tournamentId === selectedId) {
        void loadDetail(selectedId);
      }
      void loadList(schoolFilter);
    });

    socket.on('tournament:match_assigned', (payload: TournamentMatchAssignedPayload) => {
      window.localStorage.setItem('activeTournamentId', payload.tournamentId);
      useGameStore.getState().connectGame(payload.matchId);
      useGameStore.setState({
        opponentUsername: payload.opponentUsername,
        opponentElo: null,
        yourColor: null,
        tournamentId: payload.tournamentId,
        tournamentSetNumber: payload.setNumber,
        tournamentSetsPerMatch: payload.setsPerMatch,
        nextTournamentMatchId: null,
      });
      navigate('#/game');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, selectedId, schoolFilter, loadDetail, loadList, navigate]);

  // Watch selected tournament room
  useEffect(() => {
    if (!selectedId) return;
    socketRef.current?.emit('tournament:watch', { tournamentId: selectedId });
    return () => {
      socketRef.current?.emit('tournament:unwatch', { tournamentId: selectedId });
    };
  }, [selectedId]);

  const handleSelectTournament = async (id: string): Promise<void> => {
    clearAlerts();
    window.localStorage.setItem('activeTournamentId', id);
    setSelectedId(id);
    await loadDetail(id);
  };

  const handleJoinByCode = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearAlerts();
    try {
      const joined = await apiClient.post<never, { tournamentId: string }>(
        '/tournaments/join',
        {
          joinCode: joinCodeInput.trim().toUpperCase(),
          classLabel: classLabelInput.trim() || undefined,
        },
      );
      setJoinCodeInput('');
      setClassLabelInput('');
      setStatusMessage('Turnuvaya başarıyla katıldınız!');
      await loadList(schoolFilter);
      await handleSelectTournament(joined.tournamentId);
    } catch {
      setErrorMessage('Katılım başarısız. Kodu kontrol edin veya turnuva kayıtları kapanmış olabilir.');
    }
  };

  const handleCreateTournament = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearAlerts();
    try {
      const created = await apiClient.post<never, TournamentSummary>('/tournaments', {
        name: createName.trim(),
        schoolName: createSchool.trim() || undefined,
        format: 'SWISS',
        totalRounds: createRounds,
        setsPerMatch: createSets,
        turnTimeLimitSecs: createTurnSecs,
        affectsGlobalElo: createAffectsElo,
      });
      setShowCreateForm(false);
      setCreateName('');
      setStatusMessage(`Turnuva oluşturuldu! Katılım Kodu: ${created.joinCode}`);
      await loadList(schoolFilter);
      await handleSelectTournament(created.id);
    } catch {
      setErrorMessage('Turnuva oluşturulamadı.');
    }
  };

  const handleOpenCheckIn = async (): Promise<void> => {
    if (!detail) return;
    clearAlerts();
    try {
      await apiClient.post(`/tournaments/${detail.id}/open-check-in`);
      setStatusMessage('Yoklama (Check-in) açıldı! Öğrenciler şimdi "Hazırım" butonuna basabilir.');
      await loadDetail(detail.id);
    } catch {
      setErrorMessage('Yoklama açılamadı.');
    }
  };

  const handleStudentCheckIn = async (): Promise<void> => {
    if (!detail) return;
    clearAlerts();
    try {
      await apiClient.post(`/tournaments/${detail.id}/check-in`);
      setStatusMessage('Yoklamanız alındı! Tur başlatıldığında otomatik olarak maça yönlendirileceksiniz.');
      await loadDetail(detail.id);
    } catch {
      setErrorMessage('Yoklama verilemedi.');
    }
  };

  const handleStartRound = async (): Promise<void> => {
    if (!detail) return;
    clearAlerts();
    try {
      const started = await apiClient.post<
        never,
        { round: number; pairingsCreated: number }
      >(`/tournaments/${detail.id}/start-round`, {});
      setStatusMessage(
        `${started.round}. Tur başlatıldı (${started.pairingsCreated} masa oluşturuldu).`,
      );
      await loadDetail(detail.id);
    } catch {
      setErrorMessage(
        'Yeni tur başlatılamadı. Mevcut turdaki tüm masaların bitmiş ve en az 2 hazır oyuncunun olması gerekir.',
      );
    }
  };

  const handleRefereeOverride = async (
    pairingId: string,
    result: PairingResult,
  ): Promise<void> => {
    if (!detail || result === 'PENDING' || result === 'BYE') return;
    clearAlerts();
    try {
      await apiClient.patch(
        `/tournaments/${detail.id}/pairings/${pairingId}/result`,
        { result },
      );
      setStatusMessage('Hakem kararı kaydedildi.');
      await loadDetail(detail.id);
    } catch {
      setErrorMessage('Hakem kararı kaydedilemedi.');
    }
  };

  const handleDisqualify = async (
    targetUserId: string,
    disqualified: boolean,
  ): Promise<void> => {
    if (!detail) return;
    clearAlerts();
    try {
      await apiClient.patch(
        `/tournaments/${detail.id}/participants/${targetUserId}/disqualify`,
        { disqualified },
      );
      setStatusMessage(
        disqualified ? 'Oyuncu diskalifiye edildi.' : 'Diskalifiye kaldırıldı.',
      );
      await loadDetail(detail.id);
    } catch {
      setErrorMessage('İşlem başarısız oldu.');
    }
  };

  const handleExportCsv = async (): Promise<void> => {
    if (!detail) return;
    try {
      const csvBlob = await apiClient.get<never, Blob>(
        `/tournaments/${detail.id}/export`,
        {
          responseType: 'blob',
        },
      );
      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `turnuva-${detail.joinCode}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setErrorMessage('CSV raporu indirilemedi.');
    }
  };

  const myParticipant = detail?.participants.find((p) => p.userId === user?.id);
  const currentRoundPairings = detail
    ? detail.pairings.filter((p) => p.round === detail.currentRound)
    : [];
  const myCurrentRoundPairing = currentRoundPairings.find(
    (p) => user && (p.player1Id === user.id || p.player2Id === user.id),
  );
  const isWaitingForNextRound = Boolean(
    detail &&
      myParticipant &&
      !myParticipant.disqualified &&
      detail.status === 'IN_PROGRESS' &&
      !detail.myActiveMatchId &&
      myCurrentRoundPairing &&
      myCurrentRoundPairing.result !== 'PENDING',
  );

  return (
    <div className={`tournament-container ${projectionMode ? 'projection-mode' : ''}`}>
      <div className="admin-header-bar">
        <div>
          <h1 className="admin-title">🏆 Mangala Turnuva Merkezi</h1>
          <p className="admin-subtitle">
            Okul içi ve evden katılımlı İsviçre (Swiss) sistemi turnuvaları
          </p>
        </div>
        <div className="admin-actions-cell">
          {detail && (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={(): void => setProjectionMode((v) => !v)}
            >
              {projectionMode ? '📺 Normal Görünüm' : '📽️ Projeksiyon Modu'}
            </button>
          )}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={(): void => navigate('#/lobby')}
          >
            ← Lobiye Dön
          </button>
        </div>
      </div>

      {statusMessage && <div className="alert-success">{statusMessage}</div>}
      {errorMessage && <div className="alert-error">{errorMessage}</div>}

      {/* KATILIM KODU + YENİ TURNUVA */}
      {!projectionMode && (
        <div className="tournament-top-grid">
          <form className="admin-card" onSubmit={handleJoinByCode}>
            <h3>🎟️ Katılım Koduyla Turnuvaya Katıl</h3>
            <div className="admin-form-grid">
              <input
                type="text"
                className="form-input"
                placeholder="6 Haneli Kod (örn. MNG482)"
                value={joinCodeInput}
                onChange={(e): void => setJoinCodeInput(e.target.value.toUpperCase())}
                required
              />
              <input
                type="text"
                className="form-input"
                placeholder="Sınıf / Etiket (opsiyonel, örn. 6-B)"
                value={classLabelInput}
                onChange={(e): void => setClassLabelInput(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                Turnuvaya Katıl
              </button>
            </div>
          </form>

          {canCreate && (
            <div className="admin-card">
              <div className="admin-header-bar">
                <h3>🧑‍🏫 Öğretmen / Yönetici</h3>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={(): void => setShowCreateForm((v) => !v)}
                >
                  {showCreateForm ? 'Formu Kapat' : '+ Yeni Turnuva Oluştur'}
                </button>
              </div>
              {showCreateForm && (
                <form className="admin-form-grid" onSubmit={handleCreateTournament}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Turnuva Adı (örn. Sonbahar Kupası)"
                    value={createName}
                    onChange={(e): void => setCreateName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Okul Adı (opsiyonel)"
                    value={createSchool}
                    onChange={(e): void => setCreateSchool(e.target.value)}
                  />
                  <label className="tournament-inline-field">
                    Tur Sayısı:
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={12}
                      value={createRounds}
                      onChange={(e): void => setCreateRounds(Number(e.target.value))}
                    />
                  </label>
                  <label className="tournament-inline-field">
                    Set Kuralı:
                    <select
                      className="form-input"
                      value={createSets}
                      onChange={(e): void => setCreateSets(Number(e.target.value) as 1 | 2)}
                    >
                      <option value={1}>Tek Maç (Hızlı)</option>
                      <option value={2}>2 Set Rövanşlı (Taraf Değişimli)</option>
                    </select>
                  </label>
                  <label className="tournament-inline-field">
                    Hamle Süresi (sn):
                    <input
                      type="number"
                      className="form-input"
                      min={10}
                      max={300}
                      value={createTurnSecs}
                      onChange={(e): void => setCreateTurnSecs(Number(e.target.value))}
                    />
                  </label>
                  <label className="tournament-checkbox-label">
                    <input
                      type="checkbox"
                      checked={createAffectsElo}
                      onChange={(e): void => setCreateAffectsElo(e.target.checked)}
                    />
                    Genel ELO Puanını Etkilesin
                  </label>
                  <button type="submit" className="btn-primary">
                    Turnuvayı Başlat / Yayınla
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* TURNUVA LİSTESİ & OKUL FİLTRESİ */}
      {!projectionMode && (
        <div className="admin-section">
          <div className="admin-search-bar">
            <input
              type="text"
              className="form-input"
              placeholder="Okul adına göre filtrele..."
              value={schoolFilter}
              onChange={(e): void => setSchoolFilter(e.target.value)}
            />
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={(): void => {
                void loadList(schoolFilter);
              }}
            >
              Filtrele
            </button>
          </div>

          <div className="tournament-list-grid">
            {tournaments.length === 0 ? (
              <p className="admin-empty-text">Henüz oluşturulmuş turnuva yok.</p>
            ) : (
              tournaments.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tournament-list-card ${selectedId === t.id ? 'selected' : ''}`}
                  onClick={(): void => {
                    void handleSelectTournament(t.id);
                  }}
                >
                  <div className="tournament-card-top">
                    <strong>{t.name}</strong>
                    <span className="admin-badge admin-badge-success">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                  <div className="tournament-card-meta">
                    <span>Kod: <code>{t.joinCode}</code></span>
                    <span>{t.participantCount} Oyuncu</span>
                    <span>Tur: {t.currentRound}/{t.totalRounds}</span>
                    <span>{t.setsPerMatch === 2 ? '2 Set' : '1 Set'}</span>
                    {t.schoolName && <span>🏫 {t.schoolName}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* SEÇİLİ TURNUVA DETAYI / PROJEKSİYON EKRANI */}
      {detail && (
        <div className="admin-section">
          <div className="tournament-detail-banner">
            <div>
              <h2>{detail.name}</h2>
              <p className="admin-subtitle">
                {detail.schoolName ? `🏫 ${detail.schoolName} • ` : ''}
                Durum: <strong>{STATUS_LABELS[detail.status] ?? detail.status}</strong> •{' '}
                Tur: <strong>{detail.currentRound}/{detail.totalRounds}</strong> •{' '}
                {detail.setsPerMatch === 2 ? '2 Set (Taraf Değişimli)' : 'Tek Maç'} •{' '}
                {detail.affectsGlobalElo ? 'Genel ELO Puanlı' : 'Sadece Turnuva Puanı'}
              </p>
            </div>
            <div className="tournament-join-code-box">
              <span>KATILIM KODU</span>
              <strong>{detail.joinCode}</strong>
            </div>
          </div>

          {/* ÖĞRENCİ AKSİYONLARI */}
          {myParticipant && detail.myActiveMatchId && (
            <div className="admin-my-ip-banner">
              <strong>🎮 Şu an devam eden turnuva maçınız var!</strong>
              <button
                type="button"
                className="btn-primary"
                onClick={(): void => {
                  const targetMatchId = detail.myActiveMatchId;
                  if (!targetMatchId) return;
                  const myActivePairing = detail.pairings.find(
                    (p) => p.activeMatchId === targetMatchId,
                  );
                  window.localStorage.setItem('activeTournamentId', detail.id);
                  useGameStore.getState().connectGame(targetMatchId);
                  useGameStore.setState({
                    yourColor: null,
                    tournamentId: detail.id,
                    tournamentSetNumber: myActivePairing?.setNumber ?? 1,
                    tournamentSetsPerMatch: detail.setsPerMatch,
                    nextTournamentMatchId: null,
                  });
                  navigate('#/game');
                }}
              >
                Maça Git →
              </button>
            </div>
          )}

          {isWaitingForNextRound && (
            <div className="admin-my-ip-banner">
              <strong>
                {myCurrentRoundPairing?.result === 'BYE'
                  ? '🎁 Bu turda BAY geçtiniz (+1 puan). Diğer masaların bitmesini ve öğretmeninizin yeni turu başlatmasını bekleyin. Bu sayfadan ayrılmayın.'
                  : '⏳ Bu turdaki maçınızı tamamladınız! Diğer masaların bitmesini ve öğretmeninizin yeni turu başlatmasını bekleyin. Bu sayfadan ayrılmayın.'}
              </strong>
            </div>
          )}

          {myParticipant && detail.status === 'CHECK_IN' && !myParticipant.checkedIn && (
            <div className="admin-my-ip-banner">
              <strong>📣 Yoklama (Check-in) başladı! Eşleşmeye dahil olmak için onaylayın:</strong>
              <button
                type="button"
                className="btn-primary"
                onClick={(): void => {
                  void handleStudentCheckIn();
                }}
              >
                ✅ Hazırım (Yoklama Ver)
              </button>
            </div>
          )}

          {/* ÖĞRETMEN / HAKEM KONTROL BARI */}
          {canManageSelected && (
            <div className="admin-actions-cell">
              {detail.status === 'REGISTRATION' && (
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={(): void => {
                    void handleOpenCheckIn();
                  }}
                >
                  📣 Yoklama (Check-in) Aç
                </button>
              )}
              {detail.status !== 'FINISHED' && detail.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={(): void => {
                    void handleStartRound();
                  }}
                >
                  ▶ {detail.currentRound + 1}. Turu Başlat &amp; Masaları Aç
                </button>
              )}
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={(): void => {
                  void handleExportCsv();
                }}
              >
                📥 CSV İndir
              </button>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={(): void => window.print()}
              >
                🖨️ Yazdır
              </button>
            </div>
          )}

          {/* AKTİF TUR MASALARI */}
          {currentRoundPairings.length > 0 && (
            <div>
              <h3>⚔️ {detail.currentRound}. Tur Masaları</h3>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Masa</th>
                      <th>1. Oyuncu</th>
                      <th>Skor</th>
                      <th>2. Oyuncu</th>
                      <th>Durum</th>
                      {canManageSelected && <th>Hakem Kararı</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoundPairings.map((pair) => (
                      <tr key={pair.id}>
                        <td>#{pair.tableNumber}</td>
                        <td><strong>{pair.player1Username}</strong></td>
                        <td>
                          {pair.player2Id
                            ? `${pair.p1SetWins} - ${pair.p2SetWins} (Set ${pair.setNumber}/${detail.setsPerMatch})`
                            : 'BAY'}
                        </td>
                        <td>{pair.player2Username ?? '— (BAY)'}</td>
                        <td>{RESULT_LABELS[pair.result]}</td>
                        {canManageSelected && (
                          <td>
                            {pair.player2Id && (
                              <select
                                aria-label={`Masa ${pair.tableNumber} hakem kararı`}
                                className="form-input"
                                defaultValue=""
                                onChange={(e): void => {
                                  if (e.target.value) {
                                    void handleRefereeOverride(
                                      pair.id,
                                      e.target.value as PairingResult,
                                    );
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="">Sonuç Seç...</option>
                                <option value="P1_WIN">1. Oyuncu Kazandı</option>
                                <option value="P2_WIN">2. Oyuncu Kazandı</option>
                                <option value="DRAW">Berabere</option>
                                <option value="NO_SHOW_P1">1. Oyuncu Gelmedi</option>
                                <option value="NO_SHOW_P2">2. Oyuncu Gelmedi</option>
                              </select>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CANLI PUAN TABLOSU */}
          <div>
            <h3>📊 Canlı Puan Tablosu ({detail.participants.length} Oyuncu)</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Oyuncu</th>
                    <th>Sınıf</th>
                    <th>Puan</th>
                    <th>Buchholz</th>
                    <th>G / B / M</th>
                    <th>Yoklama</th>
                    {canManageSelected && <th>Hakem</th>}
                  </tr>
                </thead>
                <tbody>
                  {detail.participants.map((p, idx) => (
                    <tr key={p.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{p.username}</strong>{' '}
                        {canManageSelected && p.sharedNetworkWarning && (
                          <span
                            className="admin-badge admin-badge-warn"
                            title="Bu IP adresinden birden fazla katılımcı bağlı"
                          >
                            ⚠️ Ortak Ağ
                          </span>
                        )}
                        {p.disqualified && (
                          <span className="admin-badge admin-badge-danger">Diskalifiye</span>
                        )}
                      </td>
                      <td>{p.classLabel || '—'}</td>
                      <td><strong>{p.points}</strong></td>
                      <td>{p.buchholz}</td>
                      <td>{p.wins} / {p.draws} / {p.losses}</td>
                      <td>{p.checkedIn ? '✅ Hazır' : '⏳ Bekliyor'}</td>
                      {canManageSelected && (
                        <td>
                          <button
                            type="button"
                            className="theme-toggle-btn"
                            onClick={(): void => {
                              void handleDisqualify(p.userId, !p.disqualified);
                            }}
                          >
                            {p.disqualified ? 'Geri Al' : 'Diskalifiye Et'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
