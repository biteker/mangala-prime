# Sıradaki Görev

---

## Görev: T-15 — Rövanş (Rematch)

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 7, **T-15**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-14 (`feature/pve-bot`) `develop`'a merge edildi mi?

### Branch
`feature/rematch` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. Önce `shared/types/socket-events.types.ts` içine rövanş WebSocket event payload tiplerini ekle:
   - `game:rematch_offer` (C→S): `{ matchId: string }`
   - `game:rematch_offered` (S→C): `{ matchId: string; fromUserId: string; expiresAt: number }`
   - `game:rematch_response` (C→S): `{ matchId: string; accept: boolean }`
   - `game:rematch_declined` (S→C): `{ matchId: string }`
   - `game:rematch_start` (S→C): `{ oldMatchId: string; newMatchId: string }`
2. Backend (`game.service.ts` & `game.gateway.ts`):
   - Yalnızca `FINISHED` durumundaki maç için ve iki oyuncu bağlıyken teklif edilebilir; 30 sn süre sonunda `declined` yayınlanır.
   - Kabulde (veya iki oyuncunun eşzamanlı teklifinde yarış durumuna karşı tek seferlik) **yeni `Match` kaydı** açılır (K-7), P1 ve P2 rolleri yer değiştirir, aynı-IP → Friendly kuralı korunur.
   - Oyunculardan biri ayrılırsa bekleyen teklif iptal edilir.
3. Frontend (`game.store.ts` & `GamePage.tsx`):
   - Oyun sonu modalında "🔄 Rövanş Teklif Et" butonu, gelen teklif için kabul/ret bildirimi ve geri sayım.
4. Zorunlu testler (`game.service.spec.ts` / `game.gateway.spec.ts`):
   - Bitmemiş maçta teklif → hata; süre aşımı → declined; kabul → yeni maç ve roller değişmiş; çift kabul/teklif tek maç üretir.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 7, T-15 (Karar K-7) · `.antigravity/skills/websocket.md`

### Kabul Kriterleri
- [ ] Rövanş WebSocket tipleri `@mangala/shared` altında tanımlı
- [ ] Zorunlu 4 rövanş senaryosu birim testleriyle doğrulandı
- [ ] `npm run lint`, `npm run test` ve `npm run build` yeşil

### Sonraki Görev
T-16 — SEO, Favicon ve PWA (`feature/seo-pwa`)
