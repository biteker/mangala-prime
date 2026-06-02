import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthRegisterResponse, UserProfileResponse, AuthLoginResponse } from '@mangala/shared';

interface AuthState {
  accessToken: string | null;
  user: UserProfileResponse | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: UserProfileResponse | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<AuthRegisterResponse>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,

      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),

      login: async (username, password) => {
        const { apiClient } = await import('../lib/api-client');
        const data = (await apiClient.post('/auth/login', { username, password })) as unknown as AuthLoginResponse;
        set({ accessToken: data.accessToken });
        await get().fetchMe();
      },

      register: async (username, password) => {
        const { apiClient } = await import('../lib/api-client');
        return (await apiClient.post('/auth/register', { username, password })) as unknown as AuthRegisterResponse;
      },

      logout: async () => {
        try {
          const { apiClient } = await import('../lib/api-client');
          await apiClient.post('/auth/logout', {});
        } catch (e) {
          // Fail silently
        } finally {
          set({ accessToken: null, user: null });
        }
      },

      fetchMe: async () => {
        // Döngüsel bağımlılığı önlemek için dinamik import kullanılır
        const { apiClient } = await import('../lib/api-client');
        const user = await apiClient.get<any, UserProfileResponse>('/users/me');
        set({ user });
      },
    }),
    {
      name: 'mangala-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);
