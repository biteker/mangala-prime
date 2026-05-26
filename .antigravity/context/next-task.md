# Sıradaki Görev

---

## Görev: Tip Tanımları (Aşama 1/14)

### Ne Yapılacak?
Projenin tüm modüllerinin üzerine inşa edileceği TypeScript tip ve
interface tanımlarını oluştur. Bu dosyalar bir kez doğru yazılırsa
sonraki her modül bunları import eder — değiştirilmesi maliyetlidir,
dikkatli yaz.

### Oluşturulacak Dosyalar

**Backend:**
```
/backend/src/common/types/game.types.ts
/backend/src/common/types/api-response.types.ts
/backend/src/common/types/socket-events.types.ts
```

**Frontend:**
```
/frontend/src/lib/types/game.types.ts   (backend ile senkron)
/frontend/src/lib/types/api.types.ts
```

### İçerik Gereksinimleri

`game.types.ts` şunları içermeli:
- `BoardState = number[]` (14 elemanlı)
- `Player = 0 | 1`
- `MoveResult` interface — newBoard, nextPlayer, extraTurn, gameOver, winnerId?, capturedPits?
- `GameRoom` interface — matchId, player1SocketId, player2SocketId, board, currentPlayer, timer
- `MatchStatus` enum — ACTIVE, FINISHED, ABANDONED
- `GameEndReason` enum — NORMAL, TIMEOUT, DISCONNECT, FORFEIT

`socket-events.types.ts` şunları içermeli:
- Tüm WebSocket event payload tipleri (spec Bölüm 7)
- Her event için ayrı interface

`api-response.types.ts` şunları içermeli:
- `ApiResponse<T>` generic wrapper
- `ApiError` interface
- Tüm REST endpoint request/response tipleri (spec Bölüm 14)

### Bağlam Dosyaları
- `docs/spec.md` → Bölüm 4 (Oyun kuralları)
- `docs/spec.md` → Bölüm 7 (WebSocket event'leri)
- `docs/spec.md` → Bölüm 13 (Hata formatı)
- `docs/spec.md` → Bölüm 14 (API sözleşmesi)

### Kabul Kriterleri
- [ ] `tsc --noEmit` hatasız çalışır
- [ ] `any` tipi kullanılmamış
- [ ] Tüm WebSocket payload'ları tiplendirilmiş
- [ ] Tüm REST request/response'ları tiplendirilmiş
- [ ] Frontend tipleri backend tipleriyle senkron

### Onay Durumu
- [ ] Ajan testleri / derleme geçti
- [ ] İnsan inceledi ve onayladı
- [ ] feature/types branch'ten develop'a merge edildi

### Tamamlanınca
`current-state.md`'de Tip Tanımları satırını ✅ olarak işaretle.
Bu dosyayı (next-task.md) Aşama 2 (Prisma Şeması) ile güncelle.
