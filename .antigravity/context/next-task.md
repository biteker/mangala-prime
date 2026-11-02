# Sıradaki Görev

---

## Görev: T-14 — Bot (PvE) Modu

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 7, **T-14**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-13 (`feature/leaderboard-profile-ui`) `develop`'a merge edildi mi?

### Branch
`feature/pve-bot` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `frontend/src/lib/bot-engine.ts` dosyasını oluştur:
   - Saf fonksiyon: `chooseBotMove(board: BoardState, botPlayer: Player, level: BotLevel, rng?: () => number): number`
   - `type BotLevel = 'easy' | 'medium' | 'hard'`
   - `easy`: `getLegalMoves` listesinden rastgele seçim (test edilebilirlik için `rng` enjekte edilebilir).
   - `medium`: Açgözlü heuristic (ekstra hamle > en çok taş yakalayan hamle > rakibe en az fırsat bırakan hamle).
   - `hard`: Minimax + alpha-beta budama, derinlik 6 (`(botHazine - rakipHazine)` + ekstra hamle bonusu; ekstra hamlede aynı oyuncu tekrar oynar).
   - Simülasyon yalnızca `@mangala/shared` içindeki `applyMove` ve `getLegalMoves` ile yapılır.
2. `frontend/src/stores/game.store.ts` içine `mode: 'online' | 'local' | 'bot'` ve `botLevel: BotLevel` desteği ekle; bot hamlesi öncesi 600–1200 ms düşünme gecikmesi uygula.
3. Lobi ekranına (`LobbyPage.tsx`) "🤖 Bota Karşı Oyna (PvE)" ve zorluk seviyesi (`Kolay`, `Orta`, `Zor`) seçimi ekle.
4. `frontend/src/lib/bot-engine.spec.ts` birim testlerini yaz (her seviyede yasal hamle, medium ekstra hamle tercihi, hard 1 hamlede kazanma ve <500ms süre).

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 7, T-14 · `.antigravity/skills/frontend.md` · `.antigravity/skills/testing.md`

### Kabul Kriterleri
- [ ] `bot-engine.ts` saf fonksiyon olarak yazıldı ve `bot-engine.spec.ts` zorunlu testleri yeşil
- [ ] Lobi üzerinden Kolay/Orta/Zor seçilerek bota karşı baştan sona maç oynanabiliyor
- [ ] `npm run lint`, `npm run test` ve `npm run build` yeşil

### Sonraki Görev
T-15 — Rövanş (Rematch) (`feature/rematch`)
