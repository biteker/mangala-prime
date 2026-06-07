import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'theme-wood' | 'theme-neon' | 'theme-rustic' | 'theme-rustic-v0';

interface ThemeStore {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'theme-rustic',
      setTheme: (theme) => {
        const root = window.document.documentElement;
        root.classList.remove('theme-wood', 'theme-neon', 'theme-rustic', 'theme-rustic-v0');
        root.classList.add(theme);
        set({ theme });
      },
    }),
    {
      name: 'mangala-theme',
    }
  )
);
