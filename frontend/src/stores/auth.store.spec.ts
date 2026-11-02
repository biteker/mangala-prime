import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UserProfileResponse } from '@mangala/shared';
import { useAuthStore } from './auth.store';

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('../lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]): Promise<unknown> => mockPost(...args),
    get: (...args: unknown[]): Promise<unknown> => mockGet(...args),
  },
}));

describe('useAuthStore', () => {
  const sampleProfile: UserProfileResponse = {
    id: 'user-1',
    username: 'mangala_ustasi',
    elo: 1200,
    totalMatches: 10,
    wins: 7,
    losses: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it('should_store_access_token_in_memory_and_fetch_profile_after_login', async () => {
    // Arrange
    mockPost.mockResolvedValueOnce({ accessToken: 'jwt-memory-token-123' });
    mockGet.mockResolvedValueOnce(sampleProfile);

    // Act
    await useAuthStore.getState().login('mangala_ustasi', 'Secret123!');

    // Assert
    const state = useAuthStore.getState();
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      username: 'mangala_ustasi',
      password: 'Secret123!',
    });
    expect(mockGet).toHaveBeenCalledWith('/users/me');
    expect(state.accessToken).toBe('jwt-memory-token-123');
    expect(state.user).toEqual(sampleProfile);
  });

  it('should_clear_access_token_and_user_on_logout', async () => {
    // Arrange
    useAuthStore.setState({
      accessToken: 'jwt-memory-token-123',
      user: sampleProfile,
    });
    mockPost.mockResolvedValueOnce({});

    // Act
    await useAuthStore.getState().logout();

    // Assert
    const state = useAuthStore.getState();
    expect(mockPost).toHaveBeenCalledWith('/auth/logout', {});
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should_never_write_access_token_to_local_storage', async () => {
    // Arrange
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    mockPost.mockResolvedValueOnce({ accessToken: 'secret-jwt-access-token' });
    mockGet.mockResolvedValueOnce(sampleProfile);

    // Act
    await useAuthStore.getState().login('mangala_ustasi', 'Secret123!');

    // Assert
    expect(useAuthStore.getState().accessToken).toBe('secret-jwt-access-token');
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('mangala-auth')).toBeNull();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      const val = key ? window.localStorage.getItem(key) : null;
      expect(val).not.toContain('secret-jwt-access-token');
    }

    setItemSpy.mockRestore();
  });
});
