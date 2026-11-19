import React, { useEffect, useState, useCallback } from 'react';
import type {
  TrustedSchoolIpItem,
  AdminUserItem,
  AdminSettingsResponse,
  AdminMyIpResponse,
  AdminBulkDeleteResult,
  AdminBulkCreateResult,
  AdminResetEloResult,
  TournamentSummary,
  UserRole,
} from '@mangala/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from '../lib/router';

type AdminTab = 'school-ips' | 'users' | 'tournaments' | 'settings';

export function AdminPage(): React.JSX.Element {
  const { navigate } = useRouter();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<AdminTab>('school-ips');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // School IPs state
  const [myIpInfo, setMyIpInfo] = useState<AdminMyIpResponse | null>(null);
  const [schoolIps, setSchoolIps] = useState<TrustedSchoolIpItem[]>([]);
  const [newSchoolName, setNewSchoolName] = useState<string>('');
  const [newIpAddress, setNewIpAddress] = useState<string>('');
  const [newIpNotes, setNewIpNotes] = useState<string>('');
  const [isLoadingIps, setIsLoadingIps] = useState<boolean>(false);

  // Users state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Password reset state
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');

  // Edit username / school state
  const [editTarget, setEditTarget] = useState<AdminUserItem | null>(null);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editSchoolName, setEditSchoolName] = useState<string>('');

  // Bulk create students state
  const [showBulkCreate, setShowBulkCreate] = useState<boolean>(false);
  const [bulkUsernamesText, setBulkUsernamesText] = useState<string>('');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState<string>('');
  const [bulkSchoolName, setBulkSchoolName] = useState<string>('');

  // Tournaments state
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);

  // Settings state
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [dailyLimitInput, setDailyLimitInput] = useState<string>('3');
  const [turnLimitInput, setTurnLimitInput] = useState<string>('59');

  const clearAlerts = (): void => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const loadSchoolIps = useCallback(async (): Promise<void> => {
    setIsLoadingIps(true);
    try {
      const [ips, myIp] = await Promise.all([
        apiClient.get<never, TrustedSchoolIpItem[]>('/admin/school-ips'),
        apiClient.get<never, AdminMyIpResponse>('/admin/my-ip'),
      ]);
      setSchoolIps(ips);
      setMyIpInfo(myIp);
    } catch {
      setErrorMessage('Okul IP listesi yüklenemedi.');
    } finally {
      setIsLoadingIps(false);
    }
  }, []);

  const loadUsers = useCallback(async (searchQuery?: string): Promise<void> => {
    setIsLoadingUsers(true);
    try {
      const list = await apiClient.get<never, AdminUserItem[]>('/admin/users', {
        params: searchQuery ? { search: searchQuery } : undefined,
      });
      setUsers(list);
      setSelectedUserIds([]);
    } catch {
      setErrorMessage('Kullanıcı listesi yüklenemedi.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const loadTournaments = useCallback(async (): Promise<void> => {
    try {
      const list = await apiClient.get<never, TournamentSummary[]>('/admin/tournaments');
      setTournaments(list);
    } catch {
      setErrorMessage('Turnuva listesi yüklenemedi.');
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      return;
    }
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      try {
        const [ips, myIp, userList, tournamentList, loadedSettings] =
          await Promise.all([
            apiClient.get<never, TrustedSchoolIpItem[]>('/admin/school-ips'),
            apiClient.get<never, AdminMyIpResponse>('/admin/my-ip'),
            apiClient.get<never, AdminUserItem[]>('/admin/users'),
            apiClient.get<never, TournamentSummary[]>('/admin/tournaments'),
            apiClient.get<never, AdminSettingsResponse>('/admin/settings'),
          ]);
        if (cancelled) return;
        setSchoolIps(ips);
        setMyIpInfo(myIp);
        setUsers(userList);
        setTournaments(tournamentList);
        setSettings(loadedSettings);
        setDailyLimitInput(String(loadedSettings.schoolDailyRankedPairLimit));
        setTurnLimitInput(String(loadedSettings.defaultTurnTimeLimitSecs));
      } catch {
        if (!cancelled) {
          setErrorMessage('Yönetim paneli verileri yüklenemedi.');
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <h2>Yetkisiz Erişim</h2>
          <p>Bu sayfayı görüntülemek için yönetici (ADMIN) yetkisine sahip olmalısınız.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={(): void => navigate('#/lobby')}
          >
            Lobiye Dön
          </button>
        </div>
      </div>
    );
  }

  const selectableUsers = users.filter((u) => u.id !== user.id);
  const allSelectableChecked =
    selectableUsers.length > 0 &&
    selectableUsers.every((u) => selectedUserIds.includes(u.id));

  const toggleSelectAll = (): void => {
    if (allSelectableChecked) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableUsers.map((u) => u.id));
    }
  };

  const toggleSelectUser = (userId: string): void => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleAddSchoolIp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearAlerts();
    try {
      await apiClient.post('/admin/school-ips', {
        schoolName: newSchoolName.trim(),
        ipAddress: newIpAddress.trim(),
        notes: newIpNotes.trim() || undefined,
      });
      setNewSchoolName('');
      setNewIpAddress('');
      setNewIpNotes('');
      setStatusMessage('Güvenilir okul IP adresi eklendi.');
      await loadSchoolIps();
    } catch {
      setErrorMessage('IP eklenemedi. Geçerli ve benzersiz bir IP adresi girdiğinizden emin olun.');
    }
  };

  const handleToggleIpActive = async (item: TrustedSchoolIpItem): Promise<void> => {
    clearAlerts();
    try {
      await apiClient.patch(`/admin/school-ips/${item.id}`, {
        isActive: !item.isActive,
      });
      setStatusMessage(`${item.schoolName} durumu güncellendi.`);
      await loadSchoolIps();
    } catch {
      setErrorMessage('IP durumu güncellenemedi.');
    }
  };

  const handleDeleteIp = async (item: TrustedSchoolIpItem): Promise<void> => {
    clearAlerts();
    try {
      await apiClient.delete(`/admin/school-ips/${item.id}`);
      setStatusMessage(`${item.schoolName} (${item.ipAddress}) silindi.`);
      await loadSchoolIps();
    } catch {
      setErrorMessage('IP kaydı silinemedi.');
    }
  };

  const handleRoleChange = async (
    targetUser: AdminUserItem,
    nextRole: UserRole,
  ): Promise<void> => {
    clearAlerts();
    try {
      await apiClient.patch(`/admin/users/${targetUser.id}/role`, {
        role: nextRole,
        schoolName: targetUser.schoolName ?? undefined,
      });
      setStatusMessage(`${targetUser.username} rolü ${nextRole} olarak güncellendi.`);
      await loadUsers(userSearch);
    } catch {
      setErrorMessage('Kullanıcı rolü güncellenemedi.');
    }
  };

  const handleBulkDelete = async (): Promise<void> => {
    if (selectedUserIds.length === 0) return;
    const confirmed = window.confirm(
      `Seçili ${selectedUserIds.length} kullanıcı hesabı ve geçmiş maçları kalıcı olarak silinecek. Onaylıyor musunuz?`,
    );
    if (!confirmed) return;

    clearAlerts();
    try {
      const res = await apiClient.post<never, AdminBulkDeleteResult>(
        '/admin/users/bulk-delete',
        { userIds: selectedUserIds },
      );
      setStatusMessage(`${res.deletedCount} kullanıcı hesabı kalıcı olarak silindi.`);
      await loadUsers(userSearch);
    } catch {
      setErrorMessage('Seçili kullanıcılar silinirken bir hata oluştu.');
    }
  };

  const handleSaveUserProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editTarget) return;
    clearAlerts();
    try {
      await apiClient.patch(`/admin/users/${editTarget.id}/profile`, {
        username: editUsername.trim(),
        schoolName: editSchoolName.trim(),
      });
      setEditTarget(null);
      setStatusMessage('Kullanıcı adı ve okul bilgisi güncellendi.');
      await loadUsers(userSearch);
    } catch {
      setErrorMessage(
        'Profil güncellenemedi. Kullanıcı adı benzersiz ve en az 3 karakter olmalıdır (harf, rakam, _, ., -).',
      );
    }
  };

  const handleBulkCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearAlerts();
    const usernames = bulkUsernamesText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (usernames.length === 0) {
      setErrorMessage('Lütfen en az bir kullanıcı adı yazın.');
      return;
    }
    try {
      const res = await apiClient.post<never, AdminBulkCreateResult>(
        '/admin/users/bulk-create',
        {
          usernames,
          defaultPassword: bulkDefaultPassword,
          schoolName: bulkSchoolName.trim() || undefined,
        },
      );
      setBulkUsernamesText('');
      setBulkDefaultPassword('');
      setShowBulkCreate(false);
      setStatusMessage(
        `${res.created.length} yeni hesap oluşturuldu${
          res.skipped.length > 0
            ? `, ${res.skipped.length} mevcut kullanıcı adı atlandı (${res.skipped.join(', ')})`
            : ''
        }.`,
      );
      await loadUsers(userSearch);
    } catch {
      setErrorMessage('Toplu hesap oluşturulamadı (şifre en az 6 karakter olmalıdır).');
    }
  };

  const handleResetElo = async (onlySelected: boolean): Promise<void> => {
    const countLabel = onlySelected
      ? `seçili ${selectedUserIds.length} kullanıcının`
      : 'TÜM kullanıcıların';
    const confirmed = window.confirm(
      `${countLabel} ELO puanı 1000'e, galibiyet ve mağlubiyet sayıları 0'a sıfırlanacak. Onaylıyor musunuz?`,
    );
    if (!confirmed) return;

    clearAlerts();
    try {
      const res = await apiClient.post<never, AdminResetEloResult>(
        '/admin/users/reset-elo',
        onlySelected ? { userIds: selectedUserIds } : {},
      );
      setStatusMessage(`${res.resetCount} kullanıcının ELO ve istatistikleri sıfırlandı.`);
      await loadUsers(userSearch);
    } catch {
      setErrorMessage('ELO puanları sıfırlanamadı.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!resetTargetId) return;
    clearAlerts();
    try {
      await apiClient.post(`/admin/users/${resetTargetId}/reset-password`, {
        newPassword: resetNewPassword,
      });
      setResetTargetId(null);
      setResetNewPassword('');
      setStatusMessage('Kullanıcı şifresi başarıyla sıfırlandı.');
    } catch {
      setErrorMessage('Şifre sıfırlanamadı (en az 6 karakter olmalıdır).');
    }
  };

  const handleDeleteTournament = async (t: TournamentSummary): Promise<void> => {
    const confirmed = window.confirm(
      `"${t.name}" (${t.joinCode}) turnuvası ve eşleşmeleri silinecek. Onaylıyor musunuz?`,
    );
    if (!confirmed) return;

    clearAlerts();
    try {
      await apiClient.delete(`/admin/tournaments/${t.id}`);
      setStatusMessage(`"${t.name}" turnuvası silindi.`);
      await loadTournaments();
    } catch {
      setErrorMessage('Turnuva silinemedi.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearAlerts();
    try {
      const updated = await apiClient.patch<never, AdminSettingsResponse>('/admin/settings', {
        schoolDailyRankedPairLimit: Number(dailyLimitInput),
        defaultTurnTimeLimitSecs: Number(turnLimitInput),
      });
      setSettings(updated);
      setStatusMessage('Sistem ayarları kaydedildi.');
    } catch {
      setErrorMessage('Ayarlar kaydedilemedi. Değer aralıklarını kontrol edin.');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header-bar">
        <div>
          <h1 className="admin-title">🛡️ Yönetim Paneli (Admin Dashboard)</h1>
          <p className="admin-subtitle">
            Güvenilir okul IP adreslerini, kullanıcı hesaplarını, turnuvaları ve sistem ayarlarını yönetin.
          </p>
        </div>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={(): void => navigate('#/lobby')}
        >
          ← Lobiye Dön
        </button>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'school-ips' ? 'active' : ''}`}
          onClick={(): void => {
            clearAlerts();
            setActiveTab('school-ips');
          }}
        >
          🏫 Okul IP Yönetimi ({schoolIps.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={(): void => {
            clearAlerts();
            setActiveTab('users');
          }}
        >
          👥 Kullanıcı & Rol Yönetimi ({users.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={(): void => {
            clearAlerts();
            setActiveTab('tournaments');
          }}
        >
          🏆 Turnuvalar ({tournaments.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={(): void => {
            clearAlerts();
            setActiveTab('settings');
          }}
        >
          ⚙️ Sistem Ayarları
        </button>
      </div>

      {statusMessage && <div className="alert-success">{statusMessage}</div>}
      {errorMessage && <div className="alert-error">{errorMessage}</div>}

      {activeTab === 'school-ips' && (
        <div className="admin-section">
          {myIpInfo && (
            <div className="admin-my-ip-banner">
              <div>
                <strong>Mevcut Bağlantı IP Adresiniz:</strong>{' '}
                <code>{myIpInfo.ipAddress}</code>{' '}
                {myIpInfo.isTrustedSchoolIp ? (
                  <span className="admin-badge admin-badge-success">✓ Güvenilir Okul IP</span>
                ) : (
                  <span className="admin-badge admin-badge-muted">Listede Değil</span>
                )}
              </div>
              {!myIpInfo.isTrustedSchoolIp && (
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={(): void => setNewIpAddress(myIpInfo.ipAddress)}
                >
                  Bu IP&apos;yi Forma Aktar
                </button>
              )}
            </div>
          )}

          <form className="admin-form-grid" onSubmit={handleAddSchoolIp}>
            <input
              type="text"
              className="form-input"
              placeholder="Okul Adı (örn. Atatürk Ortaokulu)"
              value={newSchoolName}
              onChange={(e): void => setNewSchoolName(e.target.value)}
              required
            />
            <input
              type="text"
              className="form-input"
              placeholder="Statik IP Adresi (örn. 88.255.10.20)"
              value={newIpAddress}
              onChange={(e): void => setNewIpAddress(e.target.value)}
              required
            />
            <input
              type="text"
              className="form-input"
              placeholder="Not (opsiyonel, örn. Bilişim Lab)"
              value={newIpNotes}
              onChange={(e): void => setNewIpNotes(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              + Okul IP Ekle
            </button>
          </form>

          {isLoadingIps ? (
            <p>Yükleniyor...</p>
          ) : schoolIps.length === 0 ? (
            <p className="admin-empty-text">
              Henüz kayıtlı güvenilir okul IP adresi yok. Yukarıdan ekleyebilirsiniz.
            </p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Okul Adı</th>
                    <th>IP Adresi</th>
                    <th>Not</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolIps.map((item) => (
                    <tr key={item.id}>
                      <td>{item.schoolName}</td>
                      <td>
                        <code>{item.ipAddress}</code>
                      </td>
                      <td>{item.notes || '—'}</td>
                      <td>
                        <span
                          className={`admin-badge ${
                            item.isActive ? 'admin-badge-success' : 'admin-badge-muted'
                          }`}
                        >
                          {item.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="admin-actions-cell">
                        <button
                          type="button"
                          className="theme-toggle-btn"
                          onClick={(): void => {
                            void handleToggleIpActive(item);
                          }}
                        >
                          {item.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                        </button>
                        <button
                          type="button"
                          className="btn-danger-sm"
                          onClick={(): void => {
                            void handleDeleteIp(item);
                          }}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-section">
          <div className="admin-search-bar">
            <input
              type="text"
              className="form-input"
              placeholder="Kullanıcı adı veya okul ara..."
              value={userSearch}
              onChange={(e): void => setUserSearch(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={(): void => {
                void loadUsers(userSearch);
              }}
            >
              Ara
            </button>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={(): void => setShowBulkCreate((v) => !v)}
            >
              {showBulkCreate ? 'Toplu Ekle Kapat' : '📥 Toplu Öğrenci Ekle'}
            </button>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={(): void => {
                void handleResetElo(false);
              }}
            >
              🧹 Tüm ELO&apos;ları Sıfırla
            </button>
          </div>

          {selectedUserIds.length > 0 && (
            <div className="admin-my-ip-banner">
              <strong>{selectedUserIds.length} kullanıcı seçildi</strong>
              <div className="admin-actions-cell">
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={(): void => {
                    void handleResetElo(true);
                  }}
                >
                  🧹 Seçililerin ELO&apos;sunu Sıfırla
                </button>
                <button
                  type="button"
                  className="btn-danger-sm"
                  onClick={(): void => {
                    void handleBulkDelete();
                  }}
                >
                  🗑️ Seçili {selectedUserIds.length} Kullanıcıyı Sil
                </button>
              </div>
            </div>
          )}

          {showBulkCreate && (
            <form className="admin-card" onSubmit={handleBulkCreate}>
              <h3>📥 Toplu Öğrenci Hesabı Oluştur</h3>
              <p className="admin-subtitle">
                Her satıra bir kullanıcı adı yazın (örn. 5A_01, 5A_02...). Mevcut adlar otomatik atlanır.
              </p>
              <textarea
                className="form-input"
                rows={5}
                placeholder={'5A_01\n5A_02\n5A_03'}
                value={bulkUsernamesText}
                onChange={(e): void => setBulkUsernamesText(e.target.value)}
                required
              />
              <div className="admin-form-grid">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ortak Başlangıç Şifresi (en az 6 karakter)"
                  value={bulkDefaultPassword}
                  onChange={(e): void => setBulkDefaultPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Okul Adı (opsiyonel)"
                  value={bulkSchoolName}
                  onChange={(e): void => setBulkSchoolName(e.target.value)}
                />
                <button type="submit" className="btn-primary">
                  Hesapları Oluştur
                </button>
              </div>
            </form>
          )}

          {editTarget && (
            <form className="admin-reset-box" onSubmit={handleSaveUserProfile}>
              <strong>Düzenle ({editTarget.username}):</strong>
              <input
                type="text"
                className="form-input"
                placeholder="Yeni kullanıcı adı"
                value={editUsername}
                onChange={(e): void => setEditUsername(e.target.value)}
                minLength={3}
                required
              />
              <input
                type="text"
                className="form-input"
                placeholder="Okul adı (opsiyonel)"
                value={editSchoolName}
                onChange={(e): void => setEditSchoolName(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                Kaydet
              </button>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={(): void => setEditTarget(null)}
              >
                İptal
              </button>
            </form>
          )}

          {resetTargetId && (
            <form className="admin-reset-box" onSubmit={handleResetPassword}>
              <strong>Seçili Kullanıcı İçin Yeni Şifre:</strong>
              <input
                type="password"
                className="form-input"
                placeholder="En az 6 karakter"
                value={resetNewPassword}
                onChange={(e): void => setResetNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <button type="submit" className="btn-primary">
                Şifreyi Güncelle
              </button>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={(): void => {
                  setResetTargetId(null);
                  setResetNewPassword('');
                }}
              >
                İptal
              </button>
            </form>
          )}

          {isLoadingUsers ? (
            <p>Yükleniyor...</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Tümünü seç"
                        checked={allSelectableChecked}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Kullanıcı Adı</th>
                    <th>Okul</th>
                    <th>ELO</th>
                    <th>G / M</th>
                    <th>Rol</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === user.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${u.username} seç`}
                            disabled={isSelf}
                            checked={selectedUserIds.includes(u.id)}
                            onChange={(): void => toggleSelectUser(u.id)}
                          />
                        </td>
                        <td>
                          <strong>{u.username}</strong> {isSelf && '(Siz)'}
                        </td>
                        <td>{u.schoolName || '—'}</td>
                        <td>{u.elo}</td>
                        <td>
                          {u.wins} / {u.losses}
                        </td>
                        <td>
                          <select
                            aria-label={`${u.username} rolü`}
                            className="form-input admin-role-select"
                            value={u.role}
                            onChange={(e): void => {
                              void handleRoleChange(u, e.target.value as UserRole);
                            }}
                          >
                            <option value="STUDENT">Öğrenci (STUDENT)</option>
                            <option value="TEACHER">Öğretmen (TEACHER)</option>
                            <option value="ADMIN">Yönetici (ADMIN)</option>
                          </select>
                        </td>
                        <td className="admin-actions-cell">
                          <button
                            type="button"
                            className="theme-toggle-btn"
                            onClick={(): void => {
                              setEditTarget(u);
                              setEditUsername(u.username);
                              setEditSchoolName(u.schoolName ?? '');
                            }}
                          >
                            ✏️ Düzenle
                          </button>
                          <button
                            type="button"
                            className="theme-toggle-btn"
                            onClick={(): void => {
                              setResetTargetId(u.id);
                              setResetNewPassword('');
                            }}
                          >
                            🔑 Şifre
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tournaments' && (
        <div className="admin-section">
          {tournaments.length === 0 ? (
            <p className="admin-empty-text">Henüz oluşturulmuş turnuva yok.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Turnuva Adı</th>
                    <th>Kod</th>
                    <th>Okul</th>
                    <th>Durum</th>
                    <th>Tur</th>
                    <th>Oyuncu</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td><code>{t.joinCode}</code></td>
                      <td>{t.schoolName || '—'}</td>
                      <td>{t.status}</td>
                      <td>{t.currentRound}/{t.totalRounds}</td>
                      <td>{t.participantCount}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger-sm"
                          onClick={(): void => {
                            void handleDeleteTournament(t);
                          }}
                        >
                          🗑️ Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && settings && (
        <div className="admin-section">
          <form className="admin-settings-form" onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label htmlFor="school-daily-limit">
                Okul IP&apos;sinde Aynı İki Oyuncu Arası Günlük Max Puanlı Maç Sayısı (1-50)
              </label>
              <input
                id="school-daily-limit"
                type="number"
                min={1}
                max={50}
                className="form-input"
                value={dailyLimitInput}
                onChange={(e): void => setDailyLimitInput(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="default-turn-limit">
                Varsayılan Hamle Süresi (Saniye, 10-300)
              </label>
              <input
                id="default-turn-limit"
                type="number"
                min={10}
                max={300}
                className="form-input"
                value={turnLimitInput}
                onChange={(e): void => setTurnLimitInput(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary">
              Ayarları Kaydet
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
