# Sıradaki Görev

---

## Görev: T-01 — Tipli Config Modülü ve Secret Fail-Fast

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 4, **T-01**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [x] **K-2** kararı onaylandı (2026-10-31).
- [x] `feature/fix-test-and-backlog`, `feature/architecture-roadmap` ve T-03 `develop`'a merge edildi.

### Branch
`feature/config-hardening` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `backend/src/common/config/app-config.ts` → saf `loadAppConfig(env): AppConfig` fonksiyonu (JWT secret ≥ 32 karakter ve birbirinden farklı; production'da `CORS_ORIGIN` zorunlu; `DATABASE_URL` zorunlu; tur süresi 10–300 sn).
2. `backend/src/common/config/config.module.ts` → `APP_CONFIG` global provider.
3. `main.ts` içinde Nest başlamadan önce config doğrulanır; hata varsa `process.exit(1)`.
4. Tüm `process.env.JWT_*`, `CORS_ORIGIN`, `GAME_TURN_TIME_LIMIT_SECS` okumaları ve `'fallback_...'` secret'ları kaldırılır; `APP_CONFIG` inject edilir. `JwtModule` `registerAsync` ile yapılandırılır.
5. `backend/test/setup-env.ts` → Jest test env değerleri (`jest.setupFiles`).
6. `backend/.env.example` → yalnızca placeholder değerler (gerçek şifre YOK).

### İlgili Referanslar
- Spec Bölüm 8, 11 · `.antigravity/skills/api-contract.md`, `.antigravity/skills/testing.md`

### Kabul Kriterleri
- [ ] `grep -rn "fallback_" backend/src` → 0 sonuç
- [ ] `grep -rnE "process\.env\.(JWT|CORS)" backend/src` → yalnızca `app-config.ts`
- [ ] `app-config.spec.ts` içinde 7 zorunlu test (roadmap T-01 listesi) yazıldı ve geçti
- [ ] `JWT_SECRET` olmadan `npm run start:prod` → anlaşılır hata + çıkış kodu 1
- [ ] `npm run test` ve `npm run build` yeşil

### Kapsam Dışı
- Socket CORS (T-04), `/test-match` kaldırma (T-02), rate limiting (T-05)

### Sonraki Görev
T-02 — Test Endpoint'i ve Debug Artıklarının Kaldırılması
