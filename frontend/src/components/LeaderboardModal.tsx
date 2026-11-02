import React, { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@mangala/shared';
import { apiClient } from '../lib/api-client';

export interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername?: string;
  onSelectUser?: (username: string) => void;
}

export function LeaderboardModal({
  isOpen,
  onClose,
  currentUsername,
  onSelectUser,
}: LeaderboardModalProps): React.JSX.Element | null {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    apiClient
      .get<unknown, LeaderboardEntry[]>('/users/leaderboard')
      .then((data) => {
        if (!cancelled) {
          setEntries(Array.isArray(data) ? data : []);
          setErrorMessage(null);
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
              : 'Liderlik tablosu yüklenirken bir hata oluştu.';
          setErrorMessage(msg);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, reloadToken]);

  if (!isOpen) {
    return null;
  }

  const isLoading = entries === null && errorMessage === null;

  const handleClose = (): void => {
    setEntries(null);
    setErrorMessage(null);
    onClose();
  };

  const handleRetry = (): void => {
    setEntries(null);
    setErrorMessage(null);
    setReloadToken((prev) => prev + 1);
  };

  const formatRankBadge = (rank: number): string => {
    if (rank === 1) return '🥇 #1';
    if (rank === 2) return '🥈 #2';
    if (rank === 3) return '🥉 #3';
    return `#${rank}`;
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
    >
      <div className="auth-card modal-panel">
        <div className="modal-panel-header">
          <h2 id="leaderboard-modal-title" className="modal-panel-title">
            🏆 Liderlik Tablosu (İlk 50)
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
                <span>Liderlik tablosu yükleniyor...</span>
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

          {!isLoading && !errorMessage && entries && entries.length === 0 && (
            <div className="modal-state-box">
              <p className="no-users-text">
                Henüz sıralamada oyuncu bulunmuyor.
              </p>
            </div>
          )}

          {!isLoading && !errorMessage && entries && entries.length > 0 && (
            <div className="modal-table-wrapper">
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Sıra</th>
                    <th>Oyuncu</th>
                    <th>ELO</th>
                    <th>G / M</th>
                    <th>Oran</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isSelf =
                      Boolean(currentUsername) &&
                      entry.username === currentUsername;
                    const losses = Math.max(
                      0,
                      entry.totalMatches - entry.wins,
                    );
                    const winRate =
                      entry.totalMatches > 0
                        ? Math.round((entry.wins / entry.totalMatches) * 100)
                        : 0;

                    return (
                      <tr
                        key={entry.username}
                        className={
                          isSelf ? 'leaderboard-row-self' : 'leaderboard-row'
                        }
                        data-current-user={isSelf ? 'true' : 'false'}
                      >
                        <td className="leaderboard-rank-cell">
                          {formatRankBadge(entry.rank)}
                        </td>
                        <td>
                          {onSelectUser ? (
                            <button
                              type="button"
                              className="leaderboard-user-btn"
                              onClick={(): void => onSelectUser(entry.username)}
                            >
                              {entry.username}
                              {isSelf && <span className="self-pill">Sen</span>}
                            </button>
                          ) : (
                            <span className="leaderboard-user-label">
                              {entry.username}
                              {isSelf && <span className="self-pill">Sen</span>}
                            </span>
                          )}
                        </td>
                        <td className="leaderboard-elo-cell">{entry.elo}</td>
                        <td>
                          {entry.wins}G / {losses}M
                        </td>
                        <td>%{winRate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeaderboardModal;
