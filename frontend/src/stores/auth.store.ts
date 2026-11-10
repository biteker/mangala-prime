import { create } from 'zustand';
import axios from 'axios';
import type { AuthRegisterResponse, UserProfileResponse, AuthLoginResponse } from '@mangala/shared';

const SESSION_COOKIE_NAME = 'mangala_session';

const setSessionCookie = (active: boolean): void => {
  if (typeof document === 'undefined') return;
  if (active) {
    document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
};

export const hasSessionCookie = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .some((item) => item.trim().startsWith(`${SESSION_COOKIE_NAME}=1`));
};

const shouldRestoreOnBoot = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (hasSessionCookie()) return true;
  if (import.meta.env.MODE === 'test') return false;
  const hash = window.location.hash;
  return hash === '#/lobby' || hash === '#/game';
};

const getRefreshBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }
  return 'http://127.0.0.1:3000';
};

let restoreSessionPromise: Promise<void> | null = null;

interface AuthState {
  accessToken: string | null;
  user: UserProfileResponse | null;
  isRestoringSession: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: UserProfileResponse | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<AuthRegisterResponse>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  isRestoringSession: shouldRestoreOnBoot(),

  setAccessToken: (token) => {
    setSessionCookie(Boolean(token));
    set({ accessToken: token });
  },
  setUser: (user) => set({ user }),

  login: async (username, password) => {
    const { apiClient } = await import('../lib/api-client');
    const data = (await apiClient.post('/auth/login', { username, password })) as unknown as AuthLoginResponse;
    setSessionCookie(true);
    set({ accessToken: data.accessToken, isRestoringSession: false });
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
    } catch {
      // Fail silently
    } finally {
      setSessionCookie(false);
      set({ accessToken: null, user: null, isRestoringSession: false });
    }
  },

  fetchMe: async () => {
    if (!get().accessToken) {
      return;
    }
    // Döngüsel bağımlılığı önlemek için dinamik import kullanılır
    const { apiClient } = await import('../lib/api-client');
    const user = await apiClient.get<unknown, UserProfileResponse>('/users/me');
    set({ user });
  },

  restoreSession: async () => {
    if (get().accessToken) {
      set({ isRestoringSession: false });
      return;
    }
    if (!shouldRestoreOnBoot()) {
      set({ isRestoringSession: false });
      return;
    }
    if (restoreSessionPromise) {
      return restoreSessionPromise;
    }

    set({ isRestoringSession: true });
    restoreSessionPromise = (async (): Promise<void> => {
      try {
        const response = await axios.post(
          `${getRefreshBaseUrl()}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const data = (response.data?.data ?? response.data) as { accessToken?: string };
        if (data?.accessToken) {
          setSessionCookie(true);
          set({ accessToken: data.accessToken });
          await get().fetchMe();
        } else {
          setSessionCookie(false);
          set({ accessToken: null, user: null });
        }
      } catch {
        setSessionCookie(false);
        set({ accessToken: null, user: null });
      } finally {
        set({ isRestoringSession: false });
        restoreSessionPromise = null;
      }
    })();

    return restoreSessionPromise;
  },
}));
