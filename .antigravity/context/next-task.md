# Sıradaki Görev

---

## Görev: T-02 — Test Endpoint'i ve Debug Artıklarının Kaldırılması

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 4, **T-02**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [x] **K-3** kararı onaylandı (2026-10-31).
- [ ] T-01 (`feature/config-hardening`) `develop`'a merge edildi mi?

### Branch
`feature/remove-debug-endpoints` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `AppController.createTestMatch` (`POST /test-match`) ve ona ait tüm gereksiz import ve constructor bağımlılıklarını (`GameService`, `PrismaService`, `AuthService`, `JwtService`) sil.
2. `AppController` içine bir health endpoint ekle: `@Public() @Get('health')` → `{ status: 'ok' }` (ResponseInterceptor bunu `{ data: { status: 'ok' } }` olarak sarar). Dönüş tipini açıkça yaz.
3. `backend/src/app.controller.spec.ts` dosyasını yeni health endpoint'ini test edecek şekilde güncelle (`GET /health` → `{ status: 'ok' }`).
4. Kök dizindeki `ws-test.html` dosyasını sil.
5. `.gitignore` içinde `.obsidian/` olduğundan emin ol (yoksa ekle).
6. `prisma/seed.ts` dosyasını incele: production ortamında yanlışlıkla çalışmasını önlemek için `process.env.NODE_ENV === 'production'` ise seed'in çalışmayı reddetmesini veya uyarı verip çıkmasını sağla.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 4, T-02 · `.antigravity/skills/api-contract.md`, `.antigravity/skills/testing.md`

### Kabul Kriterleri
- [ ] `grep -rn "test-match\|testplayer" backend/src` → 0 sonuç
- [ ] `ws-test.html` silindi
- [ ] `GET /health` → `{ status: 'ok' }` (interceptor ile `{ data: { status: 'ok' } }`), birim testi ile doğrulandı
- [ ] `npm run test` ve `npm run build` yeşil

### Kapsam Dışı
- Socket CORS (T-04), Helmet ve rate limiting (T-05), `lobby.gateway.ts` `any` temizliği (T-06)

### Sonraki Görev
T-04 — Birleşik CORS Politikası (HTTP + WebSocket)
