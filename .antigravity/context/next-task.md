# Sıradaki Görev

---

## Görev: T-09 — Frontend Test Altyapısı

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 5, **T-09**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-11 (`feature/ws-exception-filter`) `develop`'a merge edildi mi?

### Branch
`feature/frontend-tests` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `frontend/package.json` içine devDependencies olarak `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` paketlerini ekle ve `"test": "vitest run"` script'ini tanımla.
2. `frontend/vite.config.ts` içine `test` bloğunu (`environment: 'jsdom'`, `setupFiles`) ekle (ayrı config dosyası açılmaz). PixiJS ve Web Audio mock'lanır.
3. Zorunlu test dosyalarını oluştur:
   - `frontend/src/stores/auth.store.spec.ts` (login sonrası token memory'de, logout temizler, token localStorage'a yazılmaz)
   - `frontend/src/lib/api-client.spec.ts` (401 → `/auth/refresh` → orijinal istek tekrarlanır; refresh 401 dönerse logout; eşzamanlı 401'lerde tek refresh)
   - `frontend/src/stores/game.store.spec.ts` (Yerel PvP: başlangıç tahtası, geçerli hamle sırayı değiştirir, hazine hamlesinde sıra korunur, oyun sonu tespiti)
   - `frontend/src/components/AuthGuard.spec.tsx` (Token yoksa login'e yönlendirir)

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 5, T-09 (Bulgu B-10) · `.antigravity/skills/testing.md` · `.antigravity/skills/frontend.md`

### Kabul Kriterleri
- [ ] `npm run test -w frontend` gerçek testler çalıştırıyor ve yeşil
- [ ] CI pipeline'ında frontend test sonuçları görünüyor
- [ ] `npm run lint`, `npm run test` ve `npm run build` yeşil

### Sonraki Görev
T-13 — Liderlik Tablosu ve Profil UI (`feature/leaderboard-profile-ui`)
