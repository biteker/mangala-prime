import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'theme-wood' | 'theme-neon' | 'theme-rustic' | 'theme-pixijs';

interface ThemeStore {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'theme-pixijs',
      setTheme: () => {
        const root = window.document.documentElement;
        root.classList.remove('theme-wood', 'theme-neon', 'theme-rustic', 'theme-pixijs');
        root.classList.add('theme-pixijs');
        set({ theme: 'theme-pixijs' });
      },
    }),
    {
      name: 'mangala-theme',
      merge: (_persisted, currentState) => ({
        ...currentState,
        theme: 'theme-pixijs',
      }),
    },
  ),
);
