import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { apiClient } from './api-client';
import { useAuthStore } from '../stores/auth.store';

function createUnauthorizedError(
  config: InternalAxiosRequestConfig,
): AxiosError {
  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      data: { error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
    },
  );
}

describe('apiClient interceptors', () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ accessToken: 'expired-token', user: null });
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('should_refresh_token_and_retry_original_request_on_401', async () => {
    // Arrange
    let attemptCount = 0;
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { data: { accessToken: 'fresh-access-token' } },
    });

    apiClient.defaults.adapter = async (config) => {
      attemptCount += 1;
      if (attemptCount === 1) {
        throw createUnauthorizedError(config);
      }
      return {
        data: {
          data: {
            id: 'user-1',
            username: 'oyuncu1',
            authHeader: config.headers?.Authorization,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      };
    };

    // Act
    const result = await apiClient.get<
      unknown,
      { id: string; username: string; authHeader: string }
    >('/users/me');

    // Assert
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      {},
      { withCredentials: true },
    );
    expect(useAuthStore.getState().accessToken).toBe('fresh-access-token');
    expect(attemptCount).toBe(2);
    expect(result).toEqual({
      id: 'user-1',
      username: 'oyuncu1',
      authHeader: 'Bearer fresh-access-token',
    });
  });

  it('should_logout_user_when_token_refresh_returns_401', async () => {
    // Arrange
    const logoutSpy = vi
      .spyOn(useAuthStore.getState(), 'logout')
      .mockImplementation(async () => {
        useAuthStore.setState({ accessToken: null, user: null });
      });

    const refreshError = new AxiosError('Refresh token invalid');
    vi.spyOn(axios, 'post').mockRejectedValueOnce(refreshError);

    apiClient.defaults.adapter = async (config) => {
      throw createUnauthorizedError(config);
    };

    // Act & Assert
    await expect(apiClient.get('/users/me')).rejects.toThrow(
      'Refresh token invalid',
    );
    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('should_trigger_only_one_refresh_request_for_concurrent_401_responses', async () => {
    // Arrange
    let resolveRefresh!: (val: {
      data: { data: { accessToken: string } };
    }) => void;
    const refreshPromise = new Promise<{
      data: { data: { accessToken: string } };
    }>((resolve) => {
      resolveRefresh = resolve;
    });

    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockReturnValueOnce(refreshPromise as ReturnType<typeof axios.post>);

    const callCounts: Record<string, number> = {
      '/users/me': 0,
      '/users/leaderboard': 0,
    };

    apiClient.defaults.adapter = async (config) => {
      const url = config.url ?? '';
      callCounts[url] = (callCounts[url] ?? 0) + 1;

      if (callCounts[url] === 1) {
        throw createUnauthorizedError(config);
      }

      return {
        data: {
          data: {
            endpoint: url,
            authorization: config.headers?.Authorization,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      };
    };

    // Act
    const req1 = apiClient.get<
      unknown,
      { endpoint: string; authorization: string }
    >('/users/me');
    const req2 = apiClient.get<
      unknown,
      { endpoint: string; authorization: string }
    >('/users/leaderboard');

    resolveRefresh({
      data: { data: { accessToken: 'shared-refreshed-token' } },
    });

    const [res1, res2] = await Promise.all([req1, req2]);

    // Assert
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(res1).toEqual({
      endpoint: '/users/me',
      authorization: 'Bearer shared-refreshed-token',
    });
    expect(res2).toEqual({
      endpoint: '/users/leaderboard',
      authorization: 'Bearer shared-refreshed-token',
    });
  });
});
