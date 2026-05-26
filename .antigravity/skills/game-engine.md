# SKILL: Oyun Motoru Yazma

Bu skill'i `game-engine.service.ts` yazarken oku.

---

## Temel Kural: Saf Fonksiyon

`game-engine.service.ts` içindeki HER fonksiyon saf (pure) olmalıdır:
- Dış bağımlılık yok (veritabanı, socket, timer yasak)
- Aynı girdi → her zaman aynı çıktı
- Side effect yok

Bu sayede izole unit test yazılabilir.

---

## Ana Fonksiyon İmzası

```typescript
processMove(
  board: number[],
  pitIndex: number,        // 0-5: P1 kuyuları, 7-12: P2 kuyuları
  currentPlayer: 0 | 1
): MoveResult
```

```typescript
interface MoveResult {
  newBoard: number[]
  nextPlayer: 0 | 1
  extraTurn: boolean
  gameOver: boolean
  winnerId?: string
  capturedPits?: number[]  // animasyon için hangi kuyular etkilendi
}
```

---

## Tahta İndeks Haritası

```
Index:  0   1   2   3   4   5  [6]  7   8   9  10  11  12 [13]
        P1 Kuyuları            P1H  P2 Kuyuları            P2H
```

- Index 6: Oyuncu 1'in hazinesi
- Index 13: Oyuncu 2'nin hazinesi
- Oyuncu 1'in kuyuları: 0-5
- Oyuncu 2'nin kuyuları: 7-12

---

## Dağıtım Algoritması (Adım Adım)

```
1. Seçilen kuyudaki taş sayısını al: n = board[pitIndex]
2. Eğer n == 1:
     board[pitIndex] = 0
     başlangıç = pitIndex + 1
   Eğer n > 1:
     board[pitIndex] = 1
     dağıtılacak = n - 1
     başlangıç = pitIndex + 1
3. Saatin tersi yönünde (index artarak, 13'ten sonra 0'a döner) ilerle
4. Her adımda:
   - Rakip hazinesine denk gelirse ATLA (P1 oynuyorsa index 13, P2 oynuyorsa index 6)
   - Kendi hazinesine denk gelirse bırak
   - Normal kuyuysa bırak
5. Son taş nereye düştüğünü kaydet → özel kuralları kontrol et
```

---

## Özel Kurallar (Sırayla Kontrol Et)

### 1. Hazine Kuralı (Ek Hamle)
```
Son taş kendi hazinesine düştü mü?
  → Evet: extraTurn = true, nextPlayer değişmez
```

### 2. Çift Taş Kuralı (Rakip Kuyusu)
```
Son taş rakip kuyusuna düştü VE o kuyudaki toplam çift sayı mı?
  → Evet: O kuyuyu hazineye aktar, kuyu = 0
  (Hazine kuralı bu kuraldan önce kontrol edilir)
```

### 3. Turan Taktiği (Kendi Boş Kuyusu)
```
Son taş kendi boş kuyusuna mı düştü?
  → Karşı kuyu (index: 12 - sonKuyu) dolu mu?
    → Evet: Hem kendi taşı hem karşı taşları hazineye aktar
    → Hayır: Taş o kuyuda kalır (geri alınamaz)
```

### 4. Oyun Sonu Kontrolü
```
Herhangi bir oyuncunun hazinesi >= 25 mı?
  → gameOver = true, winnerId set et

Bir oyuncunun tüm kuyuları boş mu?
  → Rakibin kuyularındaki tüm taşları kendi hazinesine aktar
  → gameOver = true, winnerId = daha fazla taşı olan
```

---

## Zorunlu Test Senaryoları

`game-engine.service.spec.ts` dosyasında şu 8 test bulunmak ZORUNDA:

```typescript
describe('GameEngineService', () => {
  it('should_grant_extra_turn_when_last_stone_lands_in_treasury')
  it('should_capture_opponent_stones_on_even_count')
  it('should_execute_turan_tactic_correctly')
  it('should_skip_turan_if_opposite_pit_is_empty')
  it('should_handle_single_stone_move_properly')
  it('should_skip_opponent_treasury_during_distribution')
  it('should_end_game_when_treasury_reaches_25')
  it('should_clear_board_and_transfer_remaining_stones_on_finish')
})
```

Her test için: başlangıç board'u açıkça tanımla, hamleyi uygula,
sonuç board'unu ve MoveResult'u assert et.
