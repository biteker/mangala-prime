import React, { useEffect, useState } from 'react';
import type { UserPublicProfileResponse } from '@mangala/shared';
import { apiClient } from '../lib/api-client';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
}

export function ProfileModal({
  isOpen,
  onClose,
  username,
}: ProfileModalProps): React.JSX.Element | null {
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserPublicProfileResponse | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !username) {
      return;
    }

    let cancelled = false;
    apiClient
      .get<unknown, UserPublicProfileResponse>(
        `/users/${encodeURIComponent(username)}`,
      )
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setErrorMessage(null);
          setLoadedForUser(username);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            typeof err === 'object' &&
            err !== null &&
            'message' in err &&
            typeof (err as { readonly message?: unknown }).message === 'string'
              ? (err as { readonly message: string }).message
              : 'Kullanıcı profili yüklenirken bir hata oluştu.';
          setErrorMessage(msg);
          setProfile(null);
          setLoadedForUser(username);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, username, reloadToken]);

  if (!isOpen || !username) {
    return null;
  }

  const isLoading = loadedForUser !== username;

  const handleClose = (): void => {
    setProfile(null);
    setErrorMessage(null);
    setLoadedForUser(null);
    onClose();
  };

  const handleRetry = (): void => {
    setProfile(null);
    setErrorMessage(null);
    setLoadedForUser(null);
    setReloadToken((prev) => prev + 1);
  };

  const recentMatches = profile ? profile.matchHistory.slice(0, 20) : [];
  const totalMatches = profile ? profile.matchHistory.length : 0;
  const winsCount = profile
    ? profile.matchHistory.filter((m) => m.result === 'WIN').length
    : 0;
  const lossesCount = profile
    ? profile.matchHistory.filter((m) => m.result === 'LOSS').length
    : 0;
  const winRate =
    totalMatches > 0 ? Math.round((winsCount / totalMatches) * 100) : 0;

  const formatResultLabel = (result: 'WIN' | 'LOSS' | 'DRAW'): string => {
    switch (result) {
      case 'WIN':
        return 'Galibiyet';
      case 'LOSS':
        return 'Mağlubiyet';
      case 'DRAW':
        return 'Beraberlik';
    }
  };

  const formatMatchDate = (isoDate: string): string => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return isoDate;
    }
    return parsed.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="auth-card modal-panel">
        <div className="modal-panel-header">
          <h2 id="profile-modal-title" className="modal-panel-title">
            👤 Oyuncu Profili: {profile?.username ?? username}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="modal-panel-body">
          {isLoading && (
            <div className="modal-state-box" role="status">
              <div className="spinner-wrapper">
                <span className="spinner"></span>
                <span>Profil bilgileri yükleniyor...</span>
              </div>
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="auth-error-alert modal-error-box" role="alert">
              <p className="modal-error-text">{errorMessage}</p>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={handleRetry}
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!isLoading && !errorMessage && profile && (
            <>
              <div className="profile-stats-grid">
                <div className="profile-stat-card">
                  <span className="profile-stat-label">ELO Puanı</span>
                  <span className="profile-stat-value">{profile.elo}</span>
                </div>
                <div className="profile-stat-card">
                  <span className="profile-stat-label">Toplam Maç</span>
                  <span className="profile-stat-value">{totalMatches}</span>
                </div>
                <div className="profile-stat-card">
                  <span className="profile-stat-label">G / M</span>
                  <span className="profile-stat-value">
                    {winsCount}G / {lossesCount}M
                  </span>
                </div>
                <div className="profile-stat-card">
                  <span className="profile-stat-label">Kazanma Oranı</span>
                  <span className="profile-stat-value">%{winRate}</span>
                </div>
              </div>

              <h3 className="profile-section-subtitle">
                Son 20 Karşılaşma ({recentMatches.length})
              </h3>

              {recentMatches.length === 0 ? (
                <div className="modal-state-box">
                  <p className="no-users-text">
                    Henüz tamamlanmış maç bulunmuyor.
                  </p>
                </div>
              ) : (
                <div className="modal-table-wrapper">
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th>Rakip</th>
                        <th>Sonuç</th>
                        <th>ELO Değişimi</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMatches.map((match) => {
                        const isFriendly =
                          match.eloChange === 0 && match.result !== 'DRAW';
                        const eloDisplay =
                          match.eloChange > 0
                            ? `+${match.eloChange}`
                            : `${match.eloChange}`;

                        return (
                          <tr key={match.id} className="leaderboard-row">
                            <td className="leaderboard-user-label">
                              {match.opponent}
                            </td>
                            <td>
                              <span
                                className={`match-result-badge result-${match.result.toLowerCase()}`}
                              >
                                {formatResultLabel(match.result)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  match.eloChange > 0
                                    ? 'elo-delta-pos'
                                    : match.eloChange < 0
                                      ? 'elo-delta-neg'
                                      : 'elo-delta-neutral'
                                }
                              >
                                {eloDisplay}
                              </span>
                              {isFriendly && (
                                <span className="friendly-match-pill">
                                  Dostluk
                                </span>
                              )}
                            </td>
                            <td>{formatMatchDate(match.date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
