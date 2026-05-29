# SKILL: Frontend Bileşen ve Store Yazma Standardı

Bu skill'i React bileşeni, Zustand store veya hook yazarken oku.

---

## Zustand Store Şablonu

```typescript
// stores/game.store.ts
import { create } from 'zustand'
import { BoardState, MoveResult } from '@/lib/types/game.types'

interface GameStore {
  board: BoardState
  currentPlayerId: string | null
  turnTimeLeft: number
  animationQueue: AnimationStep[]
  isAnimating: boolean

  // Actions
  applyStateUpdate: (board: BoardState, nextPlayerId: string, timeLeft: number) => void
  enqueueAnimation: (steps: AnimationStep[]) => void
  clearAnimation: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  board: new Array(14).fill(0),
  currentPlayerId: null,
  turnTimeLeft: 15,
  animationQueue: [],
  isAnimating: false,

  applyStateUpdate: (board, nextPlayerId, timeLeft) =>
    set({ board, currentPlayerId: nextPlayerId, turnTimeLeft: timeLeft }),

  enqueueAnimation: (steps) =>
    set({ animationQueue: steps, isAnimating: true }),

  clearAnimation: () =>
    set({ animationQueue: [], isAnimating: false }),
}))
```

---

## WebSocket Hook Şablonu

```typescript
// hooks/useSocket.ts
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '@/stores/game.store'

export function useGameSocket(matchId: string) {
  const socketRef = useRef<Socket | null>(null)
  const applyStateUpdate = useGameStore((s) => s.applyStateUpdate)

  useEffect(() => {
    const socket = io('/game', {
      auth: { token: useAuthStore.getState().accessToken },
    })
    socketRef.current = socket

    socket.on('game:state_update', ({ board, nextPlayerId, turnTimeLeft }) => {
      applyStateUpdate(board, nextPlayerId, turnTimeLeft)
    })

    return () => { socket.disconnect() }
  }, [matchId])

  const sendMove = (pitIndex: number) => {
    socketRef.current?.emit('game:move', { matchId, pitIndex })
  }

  return { sendMove }
}
```

---

## Bileşen Kuralları

```typescript
// Her bileşen kendi dosyasında, default export
// Props interface açıkça tanımlanmış
interface PitProps {
  index: number
  stoneCount: number
  isPlayable: boolean
  onClick: (index: number) => void
}

export default function Pit({ index, stoneCount, isPlayable, onClick }: PitProps) {
  return (
    <button
      disabled={!isPlayable}
      onClick={() => onClick(index)}
      className="..."
    >
      {stoneCount}
    </button>
  )
}
```

---

## Animasyon Katmanı

Animasyon store'dan bağımsız çalışır:

```typescript
// AnimationController.tsx — sadece animationQueue'yu okur
// Board state'i doğrudan değiştirmez
// Her adım: 150-200ms gecikme
// Animasyon sırasında: pointer-events: none (tıklama engeli)
// Animasyon bitince: clearAnimation() çağır
```

Animasyon bileşeni oyun motorundan bağımsızdır.
Sadece görseldir — iş mantığı içermez.

---

## Mobil Öncelikli (Mobile-First) Kuralları

```
Breakpoint önceliği: mobil → tablet → masaüstü
Tailwind: sm: md: lg: prefix'lerini bu sırayla kullan
Tahta: mobilde dikey ekranda tam görünür olmalı
Butonlar: minimum 44x44px (dokunma hedefi)
Font: minimum 16px (iOS zoom engeli)
```

---

## Tailwind Sınıf Organizasyonu

```
Layout → Spacing → Sizing → Typography → Colors → Effects → State
"flex items-center px-4 py-2 w-full text-sm font-medium text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
```

---

## Çoklu Tema Yönetimi Standardı

Tema yönetimi için Zustand store ve CSS değişkenleri kullanılır. 

### Tema Store Şablonu

```typescript
// stores/theme.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeType = 'theme-wood' | 'theme-neon'

interface ThemeStore {
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'theme-wood',
      setTheme: (theme) => {
        // Eski tema sınıflarını temizle ve yenisini ekle
        const root = window.document.documentElement
        root.classList.remove('theme-wood', 'theme-neon')
        root.classList.add(theme)
        set({ theme })
      },
    }),
    {
      name: 'mangala-theme',
    }
  )
)
```

### Tema Kullanım Kuralları

1. Bileşenlerin içinde hiçbir renk veya gölge değeri statik (hardcoded) olarak yazılmamalıdır. Her zaman CSS değişkenlerini (`var(--...)`) kullanan Tailwind sınıfları (örneğin; `bg-background`, `text-primary`, `border-border`) veya doğrudan dinamik CSS değişkenleri (`bg-[var(--board-bg)]`) tercih edilmelidir.
2. Yeni bir tema eklendiğinde sadece `globals.css` içinde o temaya ait CSS değişkenleri tanımlanmalı, bileşen kodlarına dokunulmamalıdır.

---

## Yasaklar

- `any` tipi
- Inline style (Tailwind kullan)
- `document.querySelector` veya doğrudan DOM manipülasyonu
- `useEffect` içinde event listener ekleyip temizlememek
- Store'dan gereğinden fazla state seçmek (sadece kullanılanı seç)
