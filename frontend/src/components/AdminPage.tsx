import React, { useEffect, useState, useCallback } from 'react';
import type {
  TrustedSchoolIpItem,
  AdminUserItem,
  AdminSettingsResponse,
  AdminMyIpResponse,
  UserRole,
} from '@mangala/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from '../lib/router';

type AdminTab = 'school-ips' | 'users' | 'settings';

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
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');

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
      const [ipsRes, myIpRes] = await Promise.all([
        apiClient.get<{ data: TrustedSchoolIpItem[] }>('/admin/school-ips'),
        apiClient.get<{ data: AdminMyIpResponse }>('/admin/my-ip'),
      ]);
      setSchoolIps(ipsRes.data.data);
      setMyIpInfo(myIpRes.data.data);
    } catch {
      setErrorMessage('Okul IP listesi yüklenemedi.');
    } finally {
      setIsLoadingIps(false);
    }
  }, []);

  const loadUsers = useCallback(async (searchQuery?: string): Promise<void> => {
    setIsLoadingUsers(true);
    try {
      const res = await apiClient.get<{ data: AdminUserItem[] }>('/admin/users', {
        params: searchQuery ? { search: searchQuery } : undefined,
      });
      setUsers(res.data.data);
    } catch {
      setErrorMessage('Kullanıcı listesi yüklenemedi.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      return;
    }
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      try {
        const [ipsRes, myIpRes, usersRes, settingsRes] = await Promise.all([
          apiClient.get<{ data: TrustedSchoolIpItem[] }>('/admin/school-ips'),
          apiClient.get<{ data: AdminMyIpResponse }>('/admin/my-ip'),
          apiClient.get<{ data: AdminUserItem[] }>('/admin/users'),
          apiClient.get<{ data: AdminSettingsResponse }>('/admin/settings'),
        ]);
        if (cancelled) return;
        setSchoolIps(ipsRes.data.data);
        setMyIpInfo(myIpRes.data.data);
        setUsers(usersRes.data.data);
        setSettings(settingsRes.data.data);
        setDailyLimitInput(String(settingsRes.data.data.schoolDailyRankedPairLimit));
        setTurnLimitInput(String(settingsRes.data.data.defaultTurnTimeLimitSecs));
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

  const handleSaveSettings = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearAlerts();
    try {
      const res = await apiClient.patch<{ data: AdminSettingsResponse }>('/admin/settings', {
        schoolDailyRankedPairLimit: Number(dailyLimitInput),
        defaultTurnTimeLimitSecs: Number(turnLimitInput),
      });
      setSettings(res.data.data);
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
            Güvenilir okul IP adreslerini, öğretmen yetkilerini ve turnuva ayarlarını yönetin.
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
          </div>

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
                    <th>Kullanıcı Adı</th>
                    <th>ELO</th>
                    <th>G / M</th>
                    <th>Rol</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
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
                      <td>
                        <button
                          type="button"
                          className="theme-toggle-btn"
                          onClick={(): void => {
                            setResetTargetId(u.id);
                            setResetNewPassword('');
                          }}
                        >
                          🔑 Şifre Sıfırla
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
