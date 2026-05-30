import React, { useEffect } from 'react';
import { useRouter } from './lib/router';
import { AuthGuard } from './components/AuthGuard';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { LobbyPage } from './components/LobbyPage';
import { useAuthStore } from './stores/auth.store';
import { useThemeStore } from './stores/theme.store';
import { useGameStore } from './stores/game.store';

function App(): React.JSX.Element {
  const { route, navigate } = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { matchId } = useGameStore();

  // Tema sınıfının root elementine uygulanması
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-wood', 'theme-neon');
    root.classList.add(theme);
  }, [theme]);

  const handleThemeToggle = (): void => {
    setTheme(theme === 'theme-wood' ? 'theme-neon' : 'theme-wood');
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
        return (
          <div className="auth-card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
            <h2 className="auth-title">Oyun Ekranı</h2>
            <p>Aktif Maç ID: {matchId || 'Yok'}</p>
            <button 
              type="button" 
              className="auth-button" 
              onClick={(): void => navigate('#/lobby')}
            >
              Lobiye Dön
            </button>
          </div>
        );
      default:
        return <LoginForm />;
    }
  };

  return (
    <AuthGuard>
      <header className="app-header">
        <div className="brand">Mangala Prime</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {user.username} ({user.elo} ELO)
              </span>
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
            Tema: {theme === 'theme-wood' ? 'Ahşap' : 'Neon'}
          </button>
        </div>
      </header>

      <main className="auth-container">
        {renderContent()}
      </main>
    </AuthGuard>
  );
}

export default App;
