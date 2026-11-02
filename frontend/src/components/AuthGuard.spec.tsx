import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';
import { useAuthStore } from '../stores/auth.store';

describe('AuthGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    window.location.hash = '#/lobby';
  });

  it('should_redirect_to_login_when_access_token_is_missing', () => {
    // Arrange
    window.location.hash = '#/lobby';

    // Act
    render(
      <AuthGuard>
        <div>Korunan İçerik</div>
      </AuthGuard>,
    );

    // Assert
    expect(window.location.hash).toBe('#/login');
    expect(screen.getByText('Korunan İçerik')).toBeInTheDocument();
  });

  it('should_redirect_to_lobby_when_authenticated_user_visits_login', () => {
    // Arrange
    useAuthStore.setState({ accessToken: 'valid-jwt-token', user: null });
    window.location.hash = '#/login';

    // Act
    render(
      <AuthGuard>
        <div>Giriş Ekranı</div>
      </AuthGuard>,
    );

    // Assert
    expect(window.location.hash).toBe('#/lobby');
  });
});
