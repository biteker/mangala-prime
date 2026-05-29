# Sıradaki Görev

---

## Görev: Game Gateway (WebSocket Bağlantısı ve Oyun Odası) (Aşama 7/14)

### Ne Yapılacak?
Oyun odalarını yöneten, oyuncular arası hamle iletimini sağlayan, kopma tolerans (reconnection) mekanizmasını barındıran ve WebSocket olay sözleşmelerini uygulayan `/game` namespace'li `GameGateway` bileşenlerini backend bünyesinde geliştir.

### Oluşturulacak Dosyalar

**Backend:**
```
/backend/src/game/game.gateway.ts
/backend/src/game/game.service.ts
/backend/src/game/dto/move.dto.ts
```

### İçerik Gereksinimleri

`game.gateway.ts` ve `game.service.ts` şunları içermeli:
- **WebSocket Gateway Yapılandırması:**
  - `/game` namespace altında tanımlanmalıdır.
  - İstemciler bağlanırken JWT token doğrulaması yapılmalıdır (Auth Guard entegrasyonu).
- **Hamle İşleme (`game:move`):**
  - Gelen hamle isteğini (`matchId` ve `pitIndex`) doğrular.
  - Sıra kontrolü yapar: sırası olmayan oyuncunun hamlesini `game:error` ile drop eder.
  - Geçersiz `pitIndex` durumunda `game:error` fırlatır ve mevcut board durumunu push eder.
  - Hamle sonrasında `GameEngineService.processMove` çağrılır ve yeni durum odadaki tüm oyunculara `game:state_update` event'i ile yayınlanır.
- **Kopma ve Reconnect Protokolü:**
  - Oyuncu disconnect olduğunda odaya `game:player_disconnected` yayını yapılır ve 60 saniyelik tolerans penceresi başlar.
  - Oyuncu sırasındayken disconnect olmuşsa hamle sayacı ve rakip kilitlenmelidir.
  - 60 saniye içinde `game:reconnect` çağrısı alınırsa `game:reconnect_ack` ile durum güncellenip oyun devam ettirilir.
  - 60 saniye aşılırsa maçı terk sayarak rakibe galibiyet yazar, ELO güncellemelerini tetikler ve `game:game_over` yayını yapar.
- **Sohbet Entegrasyonu:**
  - `game:chat_toggle` (sohbeti açıp kapatma) ve `game:message` (sohbet mesajı) event'leri işlenmeli, gelen mesajlar sanitize edilmelidir (XSS koruması).
- **Zaman Yönetimi:**
  - Her hamle için 15 saniyelik zamanlayıcı (timer) sunucuda koşturulmalı, süre bitiminde otomatik hükmen yenilgi uygulanmalıdır.

### Bağlam Dosyaları
- `docs/spec.md` → Bölüm 7.2, 7.3 (Oyun WebSocket olay sözleşmeleri ve Kopma Toleransı)
- `docs/spec.md` → Bölüm 8 & 16 & 19.4 (Güvenlik, Reconnect protokolü ve kabul kriterleri)
- `.antigravity/skills/websocket.md` → WebSocket yazma standartları

### Kabul Kriterleri
- [ ] Sırası olmayan oyuncu hamle attığında `game:error` dönmeli
- [ ] Geçersiz kuyu seçildiğinde `game:error` + mevcut board dönmeli
- [ ] Başarılı hamlede odadaki tüm istemcilere `game:state_update` yayını gitmeli
- [ ] Reconnect süresi (60sn) aşıldığında oyun otomatik olarak hükmen sonlanmalı ve ELO güncellenmeli
- [ ] `npm run test -w backend` tüm testlerden geçmeli
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı

### Onay Durumu
- [ ] Ajan testleri / derleme geçti
- [ ] İnsan inceledi ve onayladı
- [ ] feature/game-gateway branch'ten develop'a merge edildi
