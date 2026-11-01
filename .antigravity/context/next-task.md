# Sıradaki Görev

---

## Görev: T-08 — Ortak (Shared) Saf Oyun Motoru

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 5, **T-08**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-12 (`docs/architecture-sync`) `develop`'a merge edildi mi?

### Branch
`feature/shared-game-engine` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `shared/engine/mangala-engine.ts` dosyasını oluştur:
   - Saf, dış bağımlılıksız `processMangalaMove(board: BoardState, pitIndex: number, currentPlayer: Player): MoveResult` ve yardımcı fonksiyonlarını (`createInitialBoard` vb.) `@mangala/shared` içine taşı.
   - `shared/types/index.ts` (veya `shared` ana giriş noktası) üzerinden dışa aktar.
2. `backend/src/game/game-engine.service.ts` dosyasını `@Injectable()` ince adaptör olarak koru (`processMove` içeride `@mangala/shared` içindeki saf fonksiyonu çağırsın).
3. `frontend/src/lib/game-engine.ts` dosyasını kaldır veya `@mangala/shared` motorunu yeniden dışa aktaran ince sarmalayıcıya dönüştür; `frontend/src/stores/game.store.ts` doğrudan ortak motoru kullansın.
4. Mevcut tüm oyun motoru birim testlerinin (`game-engine.spec.ts`) eksiksiz geçtiğini ve hem backend hem frontend derlemesinin hatasız olduğunu doğrula.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 5, T-08 (Karar K-1) · `.antigravity/skills/game-engine.md` · `docs/spec.md` Bölüm 4 & 19.1

### Kabul Kriterleri
- [ ] Mangala kural algoritması yalnızca `shared/engine/mangala-engine.ts` içinde tanımlı (kod tekrarı 0)
- [ ] `npm run lint`, `npm run test` (8+ zorunlu oyun motoru testi dahil) ve `npm run build` yeşil

### Sonraki Görev
T-11 — WebSocket Exception Filter (`feature/ws-exception-filter`)
