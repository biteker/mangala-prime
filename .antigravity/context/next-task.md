# Sıradaki Görev

---

## Görev: T-26 — `/game` Soket Yarış Durumu, `connectGame` Stale-Socket ve Üst Bar Yeşil Sıra Işığı Düzeltmesi

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 8.6 (K-13).

### Ön Koşullar
- [x] T-25 (`feature/fix-endgame-sweep-and-board`) tamamlandı.

### Branch
`feature/fix-game-connect-and-turn-ui` (base: `develop`)

### Ne Yapılacak?
1. `backend/src/game/game.gateway.ts`: `ensureAuthenticatedUser` yardımcı metoduyla `handleConnection` / `handleReconnect` yarış durumu engellenecek; `handleReconnect` sonrası odaya güncel `game:state_update` yayınlanacak.
2. `frontend/src/stores/game.store.ts`: `connectGame(matchId)` eski soket bağlantısında da `yourColor`, `currentPlayerId`, `opponentUsername`, `gameOverDetails` sıfırlayıp yeni `matchId` için `game:reconnect` gönderecek.
3. `frontend/src/components/GamePage.tsx`: Üst bar `isP1Active` / `isP2Active` bayrakları gerçekten sıranın 1. veya 2. oyuncuda olmasına göre hesaplanacak; `yourColor === null` iken `'Bağlanıyor...'` gösterilecek.
