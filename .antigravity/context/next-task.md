# Sıradaki Görev

---

## Görev: T-04 — Birleşik CORS Politikası (HTTP + WebSocket)

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 4, **T-04**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [x] **K-2** kararı onaylandı (2026-10-31).
- [ ] T-02 (`feature/remove-debug-endpoints`) `develop`'a merge edildi mi?

### Branch
`feature/unified-cors` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `backend/src/common/adapters/configured-io.adapter.ts` dosyasını oluştur:
   - `IoAdapter`'ı extend eder, constructor'da `INestApplicationContext` ve `AppConfig` alır.
   - `createIOServer(port: number, options?: ServerOptions)` metodunu override ederek `cors: { origin: [...this.config.corsOrigins], credentials: true }` ayarını zorunlu olarak uygular.
2. `backend/src/main.ts` içinde `app.useWebSocketAdapter(new ConfiguredIoAdapter(app, config))` çağrısını ekle.
3. `backend/src/game/game.gateway.ts` ve `backend/src/lobby/lobby.gateway.ts` içindeki `@WebSocketGateway` decorator'larından `cors: { origin: '*' }` parametresini kaldır (`@WebSocketGateway({ namespace: '/game' })` ve `@WebSocketGateway({ namespace: '/lobby' })` olarak bırak).
4. `backend/src/common/adapters/configured-io.adapter.spec.ts` birim testini yaz (`createIOServer` çağrısında `cors.origin` ve `cors.credentials` değerlerinin `AppConfig.corsOrigins` ile override edildiğini doğrula).

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 4, T-04 · `.antigravity/skills/websocket.md`, `.antigravity/skills/testing.md`

### Kabul Kriterleri
- [ ] `grep -rn "origin: '\*'\|origin: true" backend/src` → 0 sonuç
- [ ] `configured-io.adapter.spec.ts` birim testleri geçti
- [ ] `npm run test` ve `npm run build` yeşil

### Kapsam Dışı
- Helmet ve rate limiting (T-05), `lobby.gateway.ts` `any` temizliği (T-06)

### Sonraki Görev
T-05 — Helmet ve Rate Limiting
