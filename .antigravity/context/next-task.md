# Sıradaki Görev

---

## Görev: T-11 — WebSocket Exception Filter (Spec Uyumu)

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 5, **T-11**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-08 (`feature/shared-game-engine`) `develop`'a merge edildi mi?

### Branch
`feature/ws-exception-filter` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `backend/src/common/filters/ws-exception.filter.ts` dosyasını oluştur:
   - `BaseWsExceptionFilter` (veya `WsExceptionFilter`) olarak yakalanan hataları soketin namespace'ine göre (`/game` → `game:error`, `/lobby` → `lobby:error`) `{ error: { code, message } }` formatında emit et.
   - `extractErrorCode` (T-06) yardımcı fonksiyonunu yeniden kullan; beklenmeyen hatalarda istemciye stack trace sızdırmadan `INTERNAL_ERROR` döndür.
2. `GameGateway` ve `LobbyGateway` üzerine `@UseFilters(new WsExceptionFilter())` ekle ve tekrarlayan `try/catch → client.emit('...:error')` bloklarını filtreye devret (`INVALID_MOVE` durumunda `board` alanı gönderildiği için açıkça korunur).
3. `ws-exception.filter.spec.ts` birim testlerini yaz ve mevcut gateway testlerini doğrula.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 5, T-11 (Bulgu B-11) · `.antigravity/skills/websocket.md` · `docs/spec.md` Bölüm 13.3 & 17

### Kabul Kriterleri
- [ ] `backend/src/common/filters/ws-exception.filter.ts` ve birim testleri (`ws-exception.filter.spec.ts`) mevcut
- [ ] Gateway'lerde elle yazılmış hata yakalama/emit tekrarları azaltıldı
- [ ] `npm run lint`, `npm run test` ve `npm run build` yeşil

### Sonraki Görev
T-09 — Frontend Test Altyapısı (`feature/frontend-tests`)
