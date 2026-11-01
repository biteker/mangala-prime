# Sıradaki Görev

---

## Görev: T-07 — Prisma Config Tekilleştirme

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 4, **T-07**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-06 (`feature/strict-lint-gate`) `develop`'a merge edildi mi?

### Branch
`feature/prisma-config-single-source` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. **Tek kaynak:** Kökteki `/prisma.config.ts` korunur (Dockerfile bunu kopyalar); `/prisma/prisma.config.ts` silinir.
2. Kökteki `/prisma.config.ts` dosyasından `dummy_password_for_ci_only` vb. fallback'ler kaldırılır, `env('DATABASE_URL')` kullanılır (`AGENTS.md` Prisma 7 kuralı: `earlyAccess` ve `client.adapter` YASAK).
3. `.github/workflows/ci-cd.yml` içinde `npx prisma generate` adımına workflow/step seviyesinde `env: DATABASE_URL: postgresql://ci:ci@localhost:5432/ci` verilir.
4. Seed komutu tekilleştirilir: `backend/package.json > prisma.seed` ile `prisma.config.ts > migrations.seed` çakışması giderilir (`prisma.config.ts` tek kaynak olur).
5. `npx prisma validate`, `npx prisma generate` ve yerel veritabanına `npx prisma migrate deploy` doğrulaması yapılır.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 4, T-07 · `.antigravity/skills/prisma.md` · `AGENTS.md` Prisma 7 Standardı

### Kabul Kriterleri
- [ ] Repoda yalnızca bir adet `prisma.config.ts` (kök dizinde) bulunuyor
- [ ] Kodda hiçbir DB URL fallback'i yok
- [ ] `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run test` ve `npm run build` yeşil

### Kapsam Dışı
- Ortak oyun motoru (T-08), Release & UAT (T-10)

### Sonraki Görev
T-10 — Release, UAT ve Git Hijyeni
