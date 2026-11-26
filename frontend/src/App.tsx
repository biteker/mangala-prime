import React, { useEffect, useState } from 'react';
import { useRouter } from './lib/router';
import { AuthGuard } from './components/AuthGuard';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { LobbyPage } from './components/LobbyPage';
import { GamePage } from './components/GamePage';
import { AdminPage } from './components/AdminPage';
import { TournamentPage } from './components/TournamentPage';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProfileModal } from './components/ProfileModal';
import { useAuthStore } from './stores/auth.store';
import { useThemeStore } from './stores/theme.store';

function App(): React.JSX.Element {
  const { route, navigate } = useRouter();
  const { user, logout } = useAuthStore();
  const { theme } = useThemeStore();

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  // Tema sınıfının root elementine uygulanması (yalnızca theme-pixijs sabit)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-wood', 'theme-neon', 'theme-rustic', 'theme-pixijs');
    root.classList.add(theme === 'theme-pixijs' ? theme : 'theme-pixijs');
  }, [theme]);

  // Sayfa yüklendiğinde oturumu ve kullanıcı bilgilerini tazelemek için
  useEffect(() => {
    const { accessToken, fetchMe, restoreSession } = useAuthStore.getState();
    if (accessToken) {
      fetchMe().catch(() => {});
    } else {
      restoreSession().catch(() => {});
    }
  }, []);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('#/login');
  };

  const renderContent = (): React.ReactNode => {
    switch (route) {
      case '#/login':
        return <LoginForm />;
      case '#/register':
        return <RegisterForm />;
      case '#/lobby':
        return <LobbyPage />;
      case '#/game':
        return <GamePage />;
      case '#/admin':
        return <AdminPage />;
      case '#/tournaments':
        return <TournamentPage />;
      default:
        return <LoginForm />;
    }
  };

  return (
    <AuthGuard>
      {route !== '#/game' && (
        <header className="app-header">
          <div className="brand">Mangala Prime</div>
          <div className="app-header-actions">
            {user && (
              <>
                <span className="app-header-user-badge">
                  {user.username} ({user.elo} ELO)
                </span>
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={(): void => navigate('#/tournaments')}
                >
                  🏆 Turnuvalar
                </button>
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={(): void => setIsLeaderboardOpen(true)}
                >
                  📊 Liderlik Tablosu
                </button>
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={(): void => setProfileUsername(user.username)}
                >
                  👤 Profilim
                </button>
                {user.role === 'ADMIN' && (
                  <button
                    type="button"
                    className="theme-toggle-btn"
                    onClick={(): void => navigate('#/admin')}
                  >
                    🛡️ Admin Paneli
                  </button>
                )}
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={handleLogout}
                >
                  Çıkış Yap
                </button>
              </>
            )}
          </div>
        </header>
      )}

      <main className={route === '#/game' ? 'game-page-main' : 'auth-container'}>
        {renderContent()}
      </main>

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={(): void => setIsLeaderboardOpen(false)}
        currentUsername={user?.username}
        onSelectUser={(selectedUsername: string): void => {
          setIsLeaderboardOpen(false);
          setProfileUsername(selectedUsername);
        }}
      />

      <ProfileModal
        isOpen={profileUsername !== null}
        onClose={(): void => setProfileUsername(null)}
        username={profileUsername}
      />
    </AuthGuard>
  );
}

export default App;
