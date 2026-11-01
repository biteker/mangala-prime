# Sıradaki Görev

---

## Görev: T-06 — `any` Temizliği ve Lint Kapısı

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 4, **T-06**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-05 (`feature/helmet-throttler`) `develop`'a merge edildi mi?

### Branch
`feature/strict-lint-gate` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `backend/src/common/filters/error-code.util.ts` dosyasını oluştur:
   - `export function extractErrorCode(error: unknown, fallback: string): string`
   - `HttpException` ise `getResponse()` objesinden `code: string` alanını tip daraltma ile okur; değilse `fallback` döner.
   - Birim testini yaz (`error-code.util.spec.ts`).
2. `backend/src/lobby/lobby.gateway.ts` içindeki `(error as any).response?.code` kullanımlarını `extractErrorCode(error, 'INVITE_FAILED')` ve `extractErrorCode(error, 'INVITE_RESPONSE_FAILED')` ile değiştir.
3. Kod tabanındaki ve test dosyalarındaki kalan tüm `any` kullanımlarını (`auth.controller.ts`, `user.controller.ts`, spec dosyaları, frontend vb.) tip güvenli arayüzlerle temizle (`grep -rnE ":\s*any\b|as any|<any>" backend/src frontend/src shared --include=*.ts --include=*.tsx | grep -v generated` → 0 sonuç).
4. `backend/eslint.config.mjs` ve `frontend/eslint.config.js` içinde `'@typescript-eslint/no-explicit-any': 'error'` kuralını etkinleştir (`backend/src/generated/**` lint'ten hariç tutulur).
5. Root `package.json`'a `"lint": "npm run lint -w backend && npm run lint -w frontend"` ekle (`backend/package.json` içinde `lint` script'i yoksa ekle).
6. `.github/workflows/ci-cd.yml` içine test adımından önce `npm run lint` adımını ekle.
7. Tüm lint hatalarını (0 error) kuralları gevşetmeden temizle.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 4, T-06 · `AGENTS.md` Kesin Kurallar · `docs/spec.md` Bölüm 19.6

### Kabul Kriterleri
- [ ] `grep -rnE ":\s*any\b|as any|<any>" backend/src frontend/src shared --include=*.ts --include=*.tsx | grep -v generated` → 0 sonuç
- [ ] `npm run lint` → 0 error
- [ ] `.github/workflows/ci-cd.yml` içinde `npm run lint` adımı var
- [ ] `npm run test` ve `npm run build` yeşil

### Kapsam Dışı
- Prisma config tekilleştirme (T-07), WS exception filter (T-11)

### Sonraki Görev
T-07 — Prisma Config Tekilleştirme
