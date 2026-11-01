# Sıradaki Görev

---

## Görev: T-05 — Helmet ve Rate Limiting

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 4, **T-05**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [x] **K-2** ve **K-6** kararları onaylandı (2026-10-31).
- [ ] T-04 (`feature/unified-cors`) `develop`'a merge edildi mi?

### Branch
`feature/helmet-throttler` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `backend` workspace'ine `helmet` ve `@nestjs/throttler` paketlerini kur.
2. `backend/src/main.ts`:
   - `app.getHttpAdapter().getInstance().set('trust proxy', 1)` ekle (reverse proxy arkasında gerçek IP için).
   - `helmet(...)` middleware'ini PixiJS ve WebSocket ile uyumlu CSP politikasıyla etkinleştir (`default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `connect-src 'self' wss: ws:`, `worker-src 'self' blob:`, `font-src 'self' data:`).
3. `backend/src/app.module.ts`: `ThrottlerModule.forRoot` (global 100 istek / 60 sn) ve `APP_GUARD` olarak `ThrottlerGuard` ekle.
4. Endpoint özel rate limit'leri (K-6 tablosu):
   - `POST /auth/login`: 5 istek / 60 sn
   - `POST /auth/register`: 3 istek / 10 dk (600 sn)
   - `POST /auth/refresh`: 20 istek / 60 sn
   - `GET /health`: `@SkipThrottle()`
5. `backend/src/common/filters/http-exception.filter.ts`: `ThrottlerException` (HTTP 429) yakalandığında `{ error: { code: 'RATE_LIMITED', message: 'Çok fazla istek. Lütfen biraz bekleyin.' } }` formatında dönmesini sağla.
6. `backend/src/common/guards/sliding-window-limiter.ts`: WebSocket bağlantı ve mesajları için zaman parametreli (`now: number`) saf `SlidingWindowLimiter` sınıfı yaz ve `game.gateway.ts` / `lobby.gateway.ts` içinde uygula (WS bağlantı: 20/60sn IP bazlı; `game:message`: 5/10sn userId bazlı; `game:move`: 10/5sn userId bazlı).
7. Zorunlu testleri yaz: `sliding-window-limiter.spec.ts` ve HTTP 429 `RATE_LIMITED` testi.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 4, T-05 · `docs/spec.md` Bölüm 13.2 · `.antigravity/skills/api-contract.md`, `.antigravity/skills/websocket.md`, `.antigravity/skills/testing.md`

### Kabul Kriterleri
- [ ] `sliding-window-limiter.spec.ts` ve HTTP 429 rate limit testleri geçti
- [ ] `ThrottlerException` `{ error: { code: 'RATE_LIMITED', message: '...' } }` formatında dönüyor
- [ ] `npm run test` ve `npm run build` yeşil

### Kapsam Dışı
- ESLint `no-explicit-any` kapısı (T-06), Prisma config tekilleştirme (T-07)

### Sonraki Görev
T-06 — `any` Temizliği ve Lint Kapısı
