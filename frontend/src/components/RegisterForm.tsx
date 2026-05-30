import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from '../lib/router';

export function RegisterForm(): React.JSX.Element {
  const register = useAuthStore((state) => state.register);
  const login = useAuthStore((state) => state.login);
  const { navigate } = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    if (username.length < 3) {
      setErrorMsg('Kullanıcı adı en az 3 karakter olmalıdır.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await register(username, password);
      setSuccessMsg('Kayıt başarılı! Giriş yapılıyor...');
      
      // Kayıt sonrası otomatik giriş
      setTimeout(async () => {
        try {
          await login(username, password);
          navigate('#/lobby');
        } catch (loginErr: unknown) {
          setErrorMsg('Otomatik giriş başarısız oldu, lütfen manuel giriş yapın.');
          navigate('#/login');
        }
      }, 1500);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err 
        ? (err as { message: string }).message 
        : 'Kayıt sırasında bir hata oluştu.';
      setErrorMsg(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Kayıt Ol</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {errorMsg && <div className="auth-error-alert">{errorMsg}</div>}
        {successMsg && <div className="auth-success-alert">{successMsg}</div>}
        
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
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Şifre Tekrarı</label>
          <input
            id="confirmPassword"
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? (
            <span className="spinner-wrapper">
              <span className="spinner"></span>
              Kayıt Yapılıyor...
            </span>
          ) : (
            'Kayıt Ol'
          )}
        </button>
      </form>
      
      <div className="auth-footer">
        Zaten hesabınız var mı?{' '}
        <button
          type="button"
          className="auth-link-btn"
          onClick={() => navigate('#/login')}
        >
          Giriş Yapın
        </button>
      </div>
    </div>
  );
}
