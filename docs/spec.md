# MANGALA PRIME — TEKNİK ŞARTNAME
# Versiyon: v1.5.0 | Mayıs 2026

---

## Bölüm 1 — Proje Anayasası

Teknoloji yığını, kodlama kuralları, branch stratejisi ve ajan iş akışı için → bkz. `AGENTS.md`

Bu şartname yalnızca **ürün ve teknik tasarım** detaylarını içerir.

---

## Bölüm 2 — Proje Genel Özeti ve Yol Haritası

### 2.1 Vizyon

Mangala Prime, geleneksel Türk zeka oyunu Mangala'nın dijital tarayıcı ortamına aktarıldığı,
3D görünümlü animasyonlu oyun alanı, modern sosyal lobi ve global ELO rekabet sistemi içeren platformdur.

### 2.2 Geliştirme Fazları

**Faz 1 — Çekirdek MVP:**
- Federasyon kurallarına uyumlu oyun motoru
- Local PvP modu (bkz. Bölüm 4.6)
- WebSocket tabanlı matchmaking (bkz. Bölüm 9.5) ve oyun odası
- Event Sourcing kayıt altyapısı

**Faz 2 — Sosyal Lobi:**
- Lobi arayüzü, anlık davet sistemi
- Google OAuth + Apple SSO

**Faz 3 — Gelişmiş Özellikler:**
- PvE modu (Minimax / derin öğrenme)
- Turnuva ağaçları, lig aşamaları
- Replay ve Spectator modları
- Premium üyelik + reklam entegrasyonu

---

## Bölüm 3 — Ticari Gereksinimler

- **Altyapı:** Hetzner Cloud (AWS/Azure kullanılmaz)
- **Performans Hedefi:** 100 eş zamanlı kullanıcı, gecikme/paket kaybı yok
- **MVP Modeli:** Ücretsiz, reklamsız portfolyo ürünü
- **Kayıt:** Sadece kullanıcı adı + şifre (e-posta doğrulaması Faz 2)

---

## Bölüm 4 — Çekirdek Oyun Mantığı ve Kuralları

### 4.1 Tahta Yapısı

```
Index:  0   1   2   3   4   5  [6]  7   8   9  10  11  12 [13]
        P1 Kuyuları            P1H  P2 Kuyuları            P2H
```

- 12 kuyu (her biri 4 taş) + 2 hazine = toplam 48 taş
- Bellek gösterimi: 14 elemanlı integer dizisi

### 4.2 Taş Dağıtım Algoritması

1. **Çoklu Taş (n > 1):** Kuyudan tüm taşlar alınır, 1 adet seçilen kuyuya bırakılır, kalan (n-1) taş saatin tersi yönünde dağıtılır.
2. **Tek Taş (n == 1):** Taş seçilen kuyuya bırakılmaz, doğrudan sağındaki kuyuya taşınır. Başlangıç kuyusu 0 kalır.
3. **Rakip Hazinesini Atlama:** Dağıtım rakip hazinesine (P1 için index 13, P2 için index 6) denk gelirse taş bırakılmaz, atlanır.

### 4.3 Özel Kurallar

**Hazine Kuralı (Ek Hamle):**
Son taş kendi hazinesine düşerse sıra değişmez, oyuncu 1 ek hamle hakkı kazanır.

**Çift Taş Kuralı:**
Son taş rakip kuyusuna düşer ve o kuyudaki toplam taş sayısı çift olursa, tüm taşlar kendi hazinesine aktarılır, kuyu sıfırlanır.

**Turan Taktiği:**
Son taş kendi boş kuyusuna düşer ve karşı kuyuda taş varsa; hem kendi taşı hem karşı taşlar hazineye aktarılır.
İstisna: Karşı kuyu boşsa taş o kuyuda kalır, geri alınamaz.

**Bölge Temizleme:**
Kendi bölgesindeki 6 kuyuyu ilk boşaltan oyuncu, rakibin kuyularındaki tüm taşları kazanır.

### 4.4 Zaman Yönetimi

- Her hamle için **15 saniye** süre
- Ek hamle hakkında sayaç sıfırlanır, 15 saniye yeniden başlar
- Son 5 saniyede arayüzde kırmızı alarm tetiklenir
- Süre 0'a inince otomatik hükmen mağlubiyet

### 4.5 Kazanma Koşulu

Hazinesinde **25 veya daha fazla taş** biriktiren ilk oyuncu maçı kazanır.

### 4.6 Local PvP Modu

Local PvP aynı tarayıcı sekmesinde iki oyuncunun sırayla oynamasıdır:

- **Tahta döndürme yok:** Tahta sabit kalır, P1 alt sıra (0-5), P2 üst sıra (7-12).
- **Sıra göstergesi:** Aktif oyuncunun bölgesi vurgulanır, pasif bölge soluk gösterilir.
- **State:** `GameStore` kullanılır, backend bağlantısı gerekmez.
- **Kayıt:** Local PvP maçları veritabanına kaydedilmez, ELO etkilenmez.
- **Timer:** Hamle timer'ı aynı şekilde çalışır (15 saniye).
- **Device Fingerprint:** Local PvP modunda fingerprint kontrolü uygulanmaz.
- **Matchmaking:** Local PvP'de matchmaking yoktur; "Local Maç" butonuna basıldığında doğrudan oyun başlar.

---

## Bölüm 5 — Veritabanı Stratejisi

### 5.1 Geçiş Planı

- **MVP:** SQLite (dosya tabanlı, kurulum kolaylığı)
- **Faz 2:** PostgreSQL (eş zamanlı yazma kilitleri için)
- **Faz 2:** Redis (in-memory oda yönetimi için)
- Prisma modelleri database-agnostic kurgulanmıştır.

### 5.2 Prisma Şeması

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                String   @id @default(uuid())
  username          String   @unique
  passwordHash      String
  eloScore          Int      @default(1000)
  wins              Int      @default(0)
  losses            Int      @default(0)
  deviceFingerprint String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  matchesAsP1 Match[]       @relation("Player1")
  matchesAsP2 Match[]       @relation("Player2")
  moves       MoveHistory[]
}

model Match {
  id          String      @id @default(uuid())
  player1Id   String
  player2Id   String
  winnerId    String?
  status      MatchStatus @default(ACTIVE)
  isFriendly  Boolean     @default(false)
  p1EloChange Int?
  p2EloChange Int?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  player1 User          @relation("Player1", fields: [player1Id], references: [id])
  player2 User          @relation("Player2", fields: [player2Id], references: [id])
  moves   MoveHistory[]
}

model MoveHistory {
  id         String   @id @default(uuid())
  matchId    String
  playerId   String
  pitIndex   Int
  boardState String
  createdAt  DateTime @default(now())

  match  Match @relation(fields: [matchId], references: [id])
  player User  @relation(fields: [playerId], references: [id])
}

enum MatchStatus {
  ACTIVE
  FINISHED
  ABANDONED
}
```

---

## Bölüm 6 — Sistem Mimarisi

### 6.1 Hibrit İletişim Protokolü

| İşlem | Protokol | Açıklama |
|-------|----------|----------|
| Kayıt / Giriş | REST | bcrypt hash, JWT token |
| Profil / Liderlik | REST | Prisma, cache dostu |
| Lobi / Eşleşme | WebSocket `/lobby` | Anlık durum, davetler |
| Oyun Hamle Akışı | WebSocket `/game` | Oda bazlı, milisaniye hassas |

### 6.2 State Yönetimi

**Backend:** Aktif maç odaları `Map<matchId, GameRoom>` ile in-memory tutulur.
Maç bittiğinde tek transaction ile DB'ye yazılır.

**Frontend:** Zustand store'ları:
- `AuthStore` — kullanıcı oturumu, accessToken
- `LobbyStore` — online kullanıcılar, davetler
- `GameStore` — tahta durumu, animasyon kuyruğu

---

## Bölüm 7 — WebSocket Olay Sözleşmeleri

### 7.1 Lobi (`/lobby` Namespace)

| Event | Yön | Payload |
|-------|-----|---------|
| `lobby:user_status` | S→C | `{ userId, status: 'lobby' \| 'playing' \| 'offline' }` |
| `lobby:invite_send` | C→S | `{ targetUserId }` |
| `lobby:invite_response` | C→S | `{ inviterUserId, accepted: boolean }` |
| `lobby:invite_timeout` | S→C | `{ inviterUserId }` |
| `lobby:queue_join` | C→S | `{ }` |
| `lobby:queue_leave` | C→S | `{ }` |
| `lobby:queue_timeout` | S→C | `{ message: string }` |
| `lobby:error` | S→C | `{ error: { code, message } }` |

Davet zaman aşımı: **30 saniye**
Kuyruk zaman aşımı: **120 saniye**

### 7.2 Oyun (`/game` Namespace)

| Event | Yön | Payload |
|-------|-----|---------|
| `game:move` | C→S | `{ matchId, pitIndex }` |
| `game:state_update` | S→C | `{ board, nextPlayerId, turnTimeLeft }` |
| `game:match_found` | S→C | `{ matchId, opponentUsername, opponentElo, yourColor: 0 \| 1 }` |
| `game:game_over` | S→C | `{ matchId, winnerId, reason: GameEndReason, p1EloChange, p2EloChange, finalBoard }` |
| `game:error` | S→C | `{ error: { code, message }, board? }` |
| `game:player_disconnected` | S→C | `{ playerId, reconnectWindowSecs: 60 }` |
| `game:reconnect` | C→S | `{ matchId }` |
| `game:reconnect_ack` | S→C | `{ board, nextPlayerId, turnTimeLeft, matchId, opponentUsername }` |
| `game:chat_toggle` | C→S | `{ matchId, chatEnabled }` |
| `game:message` | C→S | `{ matchId, message, type: 'text' \| 'preset' }` |

### 7.3 Kopma Tolerans Protokolü

1. Oyuncu disconnect → `game:player_disconnected` gönderilir, 60 saniyelik sayaç başlar
2. Disconnect olan oyuncunun sırası geldiyse hem hamle timer'ı hem rakip kilitlenir
3. 60 saniye içinde `game:reconnect` → oyun devam eder, `game:reconnect_ack` gönderilir
4. 60 saniye aşılırsa → hükmen yenilgi, ELO cezası uygulanır

---

## Bölüm 8 — Güvenlik Politikaları

### 8.1 İstemci Validasyonu

- **Sıra Kontrolü:** Sırası olmayan oyuncudan gelen `game:move` anında drop edilir.
- **Kuyu Geçerlilik:** `pitIndex` 0-5 arası ve kuyu dolu olmalı; geçersizse mevcut board push edilir.
- **Sohbet Sanitizasyonu:** Tüm metinler backend'de HTML/Script etiketlerinden arındırılır (XSS önlemi).

### 8.2 Hile Koruması

- **Device Fingerprinting:** FingerprintJS açık kaynak. Aynı cihazdan iki farklı hesap matchmaking kuyruğuna giremez.
- **IP Politikası:** IP engellemesi uygulanmaz (okul ortamı istisnası). Aynı IP'den gelen maçlar Friendly olarak kaydedilir, ELO etkilenmez.

---

## Bölüm 9 — Ürün Özellikleri ve UI/UX

### 9.1 Eşleşme Akışı

- "Hızlı Maç Bul" → tam sayfa yükleme ekranı yok
- Sağ üstte "Rakip Aranıyor... [İptal Et]" bileşeni aktifleşir
- Bekleme sırasında kullanıcı lobi sohbeti ve diğer maçları izleyebilir

### 9.2 Görsel Dil

- **Mobile-First** tasarım (Tailwind CSS + shadcn/ui)
- Oyun tahtası: **otantik ahşap doku**, derinlik hissi veren gölgelendirme (CSS gradyanları ve box-shadow ile pseudo-3D)
- Taşlar: parıltılı 3D küre efekti (CSS radial-gradient + box-shadow), farklı renkler (mavi, sarı, pembe, yeşil, mor)
- 3D kütüphane (Three.js vb.) kullanılmaz — tüm görsel efektler saf CSS ile sağlanır

### 9.3 Dokunmatik Hamle İlkesi

Geçerli kuyuya tıklandığı/dokunulduğu anda hamle backend'e gönderilir.
"Emin misiniz?" onay penceresi ve geri alma (undo) kesinlikle yok.

### 9.4 Ardışık Animasyon

- Taşlar sırayla düşer (anlık güncelleme yok)
- Her kuyu geçişinde 150-200ms gecikme
- Kuyu hafifçe büyür/titrer, taş sayacı senkron artar
- Animasyon süresince kullanıcı arayüzü tıklamalara kilitlenir

### 9.5 Matchmaking Algoritması

**Kuyruk Yapısı:** FIFO (First In, First Out) sıralı kuyruk.

**Akış:**
1. Oyuncu "Hızlı Maç Bul" butonuna basar → `lobby:queue_join` event'i gönderilir
2. Sunucu device fingerprint kontrolü yapar (aynı `visitorId` varsa reddeder)
3. Kuyrukta bekleyen başka oyuncu varsa eşleşme yapılır
4. Her iki oyuncuya `game:match_found` event'i gönderilir
5. Oyun odası oluşturulur, oyuncular odaya katılır

**ELO Eşleşme (Faz 2):** MVP'de FIFO yeterlidir. Faz 2'de ELO farkı ±200 içinde eşleşme tercih edilir, 30 saniye beklenirse aralık genişletilir.

**İptal:** Oyuncu "İptal Et" butonuyla `lobby:queue_leave` event'i gönderir, kuyruktan çıkarılır.

**Bekleme Limiti:** 120 saniye — süre aşılırsa istemciye `lobby:queue_timeout` event'i gönderilir, otomatik kuyruktan çıkarılır.

---

## Bölüm 10 — Test ve CI/CD

### 10.1 Zorunlu Unit Testler (Jest)

Oyun motoru için 8 test senaryosu — detay için Bölüm 19'a bakın.

### 10.2 GitHub Actions Pipeline

1. **Build:** Node.js kurulum, `npm ci`, TSC derleme
2. **Test:** `npm run test:unit` — tek test başarısız olursa pipeline kırılır
3. **Deploy:** Hetzner'a SSH + rsync
4. **Migration:** `npx prisma db push` + PM2 zero-downtime restart

---

## Bölüm 11 — Kimlik Doğrulama ve Oturum Güvenliği

### 11.1 Token Mimarisi

| Parametre | Access Token | Refresh Token |
|-----------|-------------|---------------|
| Saklama | Zustand AuthStore (memory) | httpOnly Cookie |
| Ömür | 1 saat | 30 gün |
| Cookie | — | SameSite=Strict; Secure; HttpOnly |
| Rotasyon | — | Her kullanımda yeni token |

### 11.2 Token Yenileme Akışı

1. İstemci `Authorization: Bearer <accessToken>` ile istek gönderir
2. 401 alınırsa `POST /auth/refresh` çağrılır
3. Sunucu httpOnly cookie'deki refresh token'ı okur, yeni çift üretir
4. Yeni refresh token cookie'ye yazılır, yeni access token body'de döner

### 11.3 Auth Endpoint Listesi

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/auth/register` | POST | `{ username, password }` → `{ data: { userId, username } }` |
| `/auth/login` | POST | `{ username, password }` → `{ data: { accessToken } }` + cookie |
| `/auth/refresh` | POST | Cookie → `{ data: { accessToken } }` + yeni cookie |
| `/auth/logout` | POST | Cookie temizlenir |

### 11.4 Şifre Politikası

- Minimum 8 karakter
- bcrypt, cost factor 12
- Şifre sıfırlama: Faz 2

---

## Bölüm 12 — ELO Derecelendirme Sistemi

### 12.1 Formül

```
E = 1 / (1 + 10^((rakip_elo - oyuncu_elo) / 400))
delta = K * (gerçek_skor - E)

Gerçek Skor: Galibiyet=1.0 | Beraberlik=0.5 | Yenilgi=0.0
```

### 12.2 K-Faktörü

| Seviye | Koşul | K |
|--------|-------|---|
| Yeni | İlk 30 maç veya ELO < 1200 | 40 |
| Orta | 30+ maç VE 1200 ≤ ELO < 2000 | 20 |
| Usta | 30+ maç VE ELO ≥ 2000 | 10 |

### 12.3 Özel Durumlar

| Durum | Kazanan | Kaybeden | Kayıt |
|-------|---------|----------|-------|
| Normal | +delta | -delta | Ranked |
| Hükmen / Disconnect | +15 (sabit) | -15 (sabit) | Ranked |
| Aynı IP | Değişmez | Değişmez | Friendly |
| Aynı Cihaz | Bloklanır | — | — |

- **ELO alt sınırı:** 100 (altına düşemez)
- **Başlangıç ELO:** 1000

---

## Bölüm 13 — Hata Yönetimi Standardı

### 13.1 Evrensel Format

```json
{ "data": { "..." } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Açıklayıcı mesaj." } }
```

### 13.2 HTTP Hata Kodları

| Kod | Error Code | Açıklama |
|-----|------------|----------|
| 400 | VALIDATION_ERROR | Eksik/hatalı parametre |
| 401 | UNAUTHORIZED | Token yok veya geçersiz |
| 403 | FORBIDDEN | Yetkisiz işlem |
| 404 | NOT_FOUND | Kaynak bulunamadı |
| 409 | CONFLICT | Kullanıcı adı çakışması vb. |
| 429 | RATE_LIMITED | Çok fazla istek |
| 500 | INTERNAL_ERROR | Sunucu hatası |

### 13.3 WebSocket Hata Formatı

```json
{
  "error": { "code": "INVALID_MOVE", "message": "Açıklama." },
  "board": [...]
}
```

---

## Bölüm 14 — Tam REST API Sözleşmesi

| Endpoint | Method | Auth | Açıklama |
|----------|--------|------|----------|
| `/auth/register` | POST | Public | Kayıt |
| `/auth/login` | POST | Public | Giriş |
| `/auth/refresh` | POST | Cookie | Token yenile |
| `/auth/logout` | POST | Bearer | Çıkış |
| `/users/me` | GET | Bearer | Profil |
| `/users/leaderboard` | GET | Public | ELO sıralaması ilk 50 |
| `/users/:username` | GET | Public | Kullanıcı profili |
| `/matches/:id` | GET | Bearer | Maç detayı |

### Sohbet Rate Limiting

- 5 saniyede maksimum 3 mesaj
- Maksimum mesaj uzunluğu: 200 karakter
- Preset mesaj listesi backend'de sabit tanımlı

---

## Bölüm 15 — Device Fingerprinting

- **Kütüphane:** FingerprintJS açık kaynak
- **Kullanım:** Giriş sırasında `visitorId` alınır, User kaydına yazılır
- **Kural:** Matchmaking kuyruğunda aynı `visitorId` tespit edilirse ikinci kullanıcı kuyruğa alınmaz
- **KVKK:** Gizlilik politikasında amaç açıkça belirtilir, üçüncü tarafla paylaşılmaz

---

## Bölüm 16 — Reconnect Protokolü

| Adım | Olay | Açıklama |
|------|------|----------|
| 1 | Disconnect | `game:player_disconnected` → 60sn sayaç |
| 2 | Sıra durumu | Disconnect eden sırasındaysa her iki taraf kilitlenir |
| 3a | Reconnect (≤60sn) | `game:reconnect` → `game:reconnect_ack` → devam |
| 3b | Timeout (>60sn) | Hükmen yenilgi, ELO cezası |
| 4 | Rakip çıkarsa | Rakip "Çık" basarsa terk sayılır, ELO cezası rakibe |

---

## Bölüm 17 — Klasör Yapısı

### Ortak / Paylaşılan (Shared)

```
/shared/
  /types/
    game.types.ts          ← Oyun tipleri (BoardState, Player, MoveResult, MatchStatus, GameEndReason)
    api-response.types.ts  ← ApiResponse<T>, ApiError, REST request/response tipleri
    socket-events.types.ts ← Tüm WebSocket event payload tipleri
```

> **Not:** `shared/` klasörü hem backend hem frontend tarafından import edilir.
> Backend ve frontend kendi `tsconfig.json` dosyalarında `shared/` klasörüne path mapping tanımlar.
> Backend-only tipler (GameRoom, timer vb.) `shared/` içinde yer almaz.

### Çevre Değişkenleri Şablonları

```
/backend/.env.example
/frontend/.env.example
```

### Backend

```
/backend/src/
  /auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    auth.guard.ts
    dto/register.dto.ts
    dto/login.dto.ts
    strategies/jwt.strategy.ts
  /game/
    game.module.ts
    game.gateway.ts
    game.service.ts
    game-engine.service.ts
    game-engine.spec.ts
    dto/move.dto.ts
    types/game-room.types.ts  ← Backend-only: GameRoom, timer, socketId gibi sunucu tipleri
  /lobby/
    lobby.module.ts
    lobby.gateway.ts
    lobby.service.ts
    dto/invite.dto.ts
  /user/
    user.module.ts
    user.controller.ts
    user.service.ts
  /elo/
    elo.module.ts
    elo.service.ts
    elo.service.spec.ts
  /common/
    /filters/http-exception.filter.ts
    /filters/ws-exception.filter.ts
    /interceptors/response.interceptor.ts
    /prisma/prisma.service.ts
    /prisma/prisma.module.ts
/prisma/schema.prisma
/prisma/seed.ts
```

### Frontend

```
/frontend/src/
  /assets/
  /components/
    /ui/
    /board/
      GameBoard.tsx
      Pit.tsx
      Stone.tsx
      Treasury.tsx
      AnimationController.tsx
    /lobby/
      LobbyPanel.tsx
      MatchmakingIndicator.tsx
      PlayerList.tsx
    /auth/
      LoginForm.tsx
      RegisterForm.tsx
    /layout/
      AppShell.tsx
  /stores/
    auth.store.ts
    game.store.ts
    lobby.store.ts
  /hooks/
    useSocket.ts
    useGameEngine.ts
    useAnimationQueue.ts
  /pages/
    LoginPage.tsx
    LobbyPage.tsx
    GamePage.tsx
    LeaderboardPage.tsx
  /lib/
    api.ts
    socket.ts
    elo.utils.ts
```

---

## Bölüm 18 — Geliştirme Sırası

| Aşama | Modül | Bağımlı Olduğu |
|-------|-------|----------------|
| 1 | Tip Tanımları | — |
| 2 | Prisma Şeması | Tip tanımları |
| 3 | ELO Servisi + Testleri | Tip tanımları |
| 4 | Oyun Motoru + Testleri | Tip tanımları |
| 5 | Auth Modülü | Prisma, Tipler |
| 6 | User Modülü | Prisma, Auth |
| 7 | Game Gateway | Oyun motoru, ELO, Auth |
| 8 | Lobby Gateway | Auth, User |
| 9 | Frontend Store + API | Backend tamamlanmış |
| 10 | Frontend Auth sayfaları | Auth store |
| 11 | Frontend Lobi | Lobby store |
| 12 | Frontend Oyun tahtası | Game store |
| 13 | Frontend Animasyon | Tahta stabil |
| 14 | CI/CD + Deploy | Tümü |

### AI Oturum Planı

| Oturum | Görev | Verilecek Bağlam |
|--------|-------|-----------------|
| 1 | Tip tanımları | Bölüm 4, 7, 13 |
| 2 | Prisma şeması | Bölüm 5, 12.5 |
| 3 | ELO servisi | Bölüm 12 |
| 4 | Oyun motoru | Bölüm 4, 19.1 |
| 5 | Auth modülü | Bölüm 11 |
| 6 | Game Gateway | Bölüm 7, 16 |
| 7 | Lobby Gateway | Bölüm 7 |
| 8 | User controller | Bölüm 14 |
| 9 | Frontend store + API | Bölüm 6.2, 14 |
| 10 | Frontend oyun tahtası | Bölüm 9 |
| 11 | Frontend animasyon | Bölüm 9.4 |

---

## Bölüm 19 — Kabul Kriterleri

### 19.1 Oyun Motoru (8 Zorunlu Test)

| Test | Senaryo | Beklenen |
|------|---------|---------|
| `should_grant_extra_turn` | Son taş hazineye düşer | `extraTurn: true`, sıra değişmez |
| `should_capture_on_even_count` | Rakip kuyu çiftlenir | Taşlar hazineye, kuyu sıfır |
| `should_execute_turan_tactic` | Boş kuyuya düşer, karşısı dolu | Her iki taraf hazineye |
| `should_skip_turan_if_empty` | Boş kuyuya düşer, karşısı boş | Taş kuyuda kalır |
| `should_handle_single_stone` | Kuyuda 1 taş | Taş sağa kayar, kuyu 0 |
| `should_skip_opponent_treasury` | Dağıtım rakip hazinesine denk | Hazine atlanır |
| `should_end_game_at_25` | Hazine 25'e ulaşır | `gameOver: true` |
| `should_clear_board_on_finish` | Bölge tamamen boşalır | Rakip taşlar hazineye |

### 19.2 ELO Servisi (5 Zorunlu Test)

| Test | Senaryo | Beklenen |
|------|---------|---------|
| `should_apply_k40_for_new` | ELO < 1200 veya maç < 30 | K=40 |
| `should_apply_k20_for_mid` | 1200 ≤ ELO < 2000, maç ≥ 30 | K=20 |
| `should_apply_k10_for_master` | ELO ≥ 2000, maç ≥ 30 | K=10 |
| `should_not_go_below_floor` | Sonuç < 100 | ELO = 100 |
| `should_apply_fixed_penalty` | Hükmen/disconnect | +15/-15 sabit |

### 19.3 Auth Modülü

- Aynı kullanıcı adıyla ikinci kayıt → 409 CONFLICT
- Yanlış şifre → 401 UNAUTHORIZED
- Başarılı loginde `accessToken` body'de, refresh token cookie'de
- Korumalı endpoint'e token olmadan → 401
- Tüm hatalar `{ error: { code, message } }` formatında

### 19.4 Game Gateway

- Sırası olmayan oyuncudan `game:move` → `game:error`, işlenmez
- Geçersiz `pitIndex` → `game:error` + mevcut board push
- Başarılı hamlede tüm odaya `game:state_update` yayınlanır
- Reconnect ≤ 60sn → oyun devam eder
- Reconnect > 60sn → hükmen, ELO güncellenir

### 19.5 Frontend Oyun Tahtası

- 14 elemanlı board doğru pozisyonlara render edilir
- Animasyon sırasında tıklama engellenir
- Taşlar sırayla düşer (150-200ms gecikme)
- 5 saniye altında sayaç kırmızıya döner
- Mobilde (< 768px) tahta tam ve ortalı görünür

### 19.6 Genel TypeScript Kuralları

- `any` kullanımı: 0 adet
- TSC `--strict` hatasız
- Her DTO class-validator ile doğrulanmış
- Tüm Prisma sorguları try-catch ile sarılmış

### 19.7 Oturum Sonu Kontrol Soruları (Ajana Her Oturumda Sor)

1. Bu oturumda hangi dosyalar oluşturuldu veya değiştirildi?
2. Hangi edge case'leri düşündün, hangilerini kapsadın?
3. Bir sonraki modül için hangi tiplere ihtiyaç var?
4. Mevcut kodda bilinen eksik veya kırılgan nokta var mı?
5. Testler çalıştırıldı mı? Kaçı geçti?
