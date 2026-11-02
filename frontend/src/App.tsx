import React, { useEffect, useState } from 'react';
import { useRouter } from './lib/router';
import { AuthGuard } from './components/AuthGuard';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { LobbyPage } from './components/LobbyPage';
import { GamePage } from './components/GamePage';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProfileModal } from './components/ProfileModal';
import { useAuthStore } from './stores/auth.store';
import { useThemeStore } from './stores/theme.store';

function App(): React.JSX.Element {
  const { route, navigate } = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  // Tema sınıfının root elementine uygulanması
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-wood', 'theme-neon', 'theme-rustic', 'theme-pixijs');
    root.classList.add(theme);
  }, [theme]);

  // Sayfa yüklendiğinde kullanıcı bilgilerini tazelemek için
  useEffect(() => {
    const { accessToken, fetchMe } = useAuthStore.getState();
    if (accessToken) {
      fetchMe().catch(() => {});
    }
  }, []);

  const handleThemeToggle = (): void => {
    const order: Array<typeof theme> = ['theme-wood', 'theme-neon', 'theme-rustic', 'theme-pixijs'];
    const currentIndex = order.indexOf(theme);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  const getThemeLabel = (): string => {
    switch (theme) {
      case 'theme-wood': return 'Ahşap';
      case 'theme-neon': return 'Neon';
      case 'theme-rustic': return 'Rustik';
      case 'theme-pixijs': return 'PixiJS';
      default: return 'Ahşap';
    }
  };

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
                  onClick={(): void => setIsLeaderboardOpen(true)}
                >
                  🏆 Liderlik Tablosu
                </button>
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={(): void => setProfileUsername(user.username)}
                >
                  👤 Profilim
                </button>
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={handleLogout}
                >
                  Çıkış Yap
                </button>
              </>
            )}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={handleThemeToggle}
            >
              Tema: {getThemeLabel()}
            </button>
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
