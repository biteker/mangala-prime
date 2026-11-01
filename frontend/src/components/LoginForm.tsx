import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from '../lib/router';

export function LoginForm(): React.JSX.Element {
  const login = useAuthStore((state) => state.login);
  const { navigate } = useRouter();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(username, password);
      navigate('#/lobby');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err 
        ? (err as { message: string }).message 
        : 'Giriş yapılırken bir hata oluştu.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Giriş Yap</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {errorMsg && <div className="auth-error-alert">{errorMsg}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Kullanıcı Adı</label>
          <input
            id="username"
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? (
            <span className="spinner-wrapper">
              <span className="spinner"></span>
              Giriş Yapılıyor...
            </span>
          ) : (
            'Giriş Yap'
          )}
        </button>
      </form>
      
      <div className="auth-footer">
        Hesabınız yok mu?{' '}
        <button
          type="button"
          className="auth-link-btn"
          onClick={() => navigate('#/register')}
        >
          Kayıt Olun
        </button>
      </div>
    </div>
  );
}
