import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { AuthRegisterResponse, UserProfileResponse } from '@mangala/shared';

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
        const response = await axios.post(
          'http://localhost:3000/auth/login',
          { username, password },
          { withCredentials: true },
        );
        const data = response.data.data || response.data;
        set({ accessToken: data.accessToken });
        await get().fetchMe();
      },

      register: async (username, password) => {
        const response = await axios.post(
          'http://localhost:3000/auth/register',
          { username, password },
        );
        return response.data.data || response.data;
      },

      logout: async () => {
        try {
          await axios.post(
            'http://localhost:3000/auth/logout',
            {},
            { withCredentials: true },
          );
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
