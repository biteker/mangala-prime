# Sıradaki Görev

---

## Görev: Lobby Gateway (WebSocket Lobi ve Davet Yönetimi) (Aşama 8/14)

### Ne Yapılacak?
Lobi durumlarını takip eden, oyuncuların birbirlerine oyun daveti göndermesini yöneten, davet zaman aşımlarını uygulayan ve eşleşme (matchmaking) kuyruğunu yöneten `/lobby` namespace'li `LobbyGateway` bileşenlerini backend bünyesinde geliştir.

### Oluşturulacak Dosyalar

**Backend:**
```
/backend/src/lobby/lobby.gateway.ts
/backend/src/lobby/lobby.service.ts
/backend/src/lobby/dto/invite.dto.ts
```

### İçerik Gereksinimleri

`lobby.gateway.ts` ve `lobby.service.ts` şunları içermeli:
- **WebSocket Gateway Yapılandırması:**
  - `/lobby` namespace altında tanımlanmalıdır.
  - İstemciler bağlanırken JWT token doğrulaması yapılmalıdır (Auth Guard entegrasyonu).
  - Bağlantı kurulduğunda kullanıcının lobi durumunu `lobby` olarak güncellemeli ve diğer kullanıcılara `lobby:user_status` yayını yapmalıdır.
- **Davet Mekanizması (`lobby:invite_send` ve `lobby:invite_response`):**
  - İstemci bir diğer kullanıcıyı davet ettiğinde, davet edilen tarafa `lobby:invite_send` (sunucudan istemciye) iletilir.
  - Davet eden ve edilen arasındaki davet ilişkisi 30 saniye boyunca geçerlidir. 30 saniye dolarsa otomatik olarak `lobby:invite_timeout` gönderilir.
  - Davet kabul edilirse (`accepted: true`), lobi servisi bir `Match` kaydı oluşturur, `GameService.initializeGame`'i tetikler ve her iki oyuncuya da `/game` namespace'ine bağlanmaları için bildirim gönderir.
- **Matchmaking Kuyruğu (`lobby:queue_join` ve `lobby:queue_leave`):**
  - Kuyruğa giren oyuncular bellekteki FIFO kuyruğunda biriktirilir.
  - Kuyruğa giren oyuncular için 120 saniyelik zaman aşımı (queue timeout) uygulanır. Süre dolarsa `lobby:queue_timeout` gönderilip kuyruktan çıkarılır.
  - Kuyrukta iki oyuncu eşleştiğinde, SQLite DB'de yeni bir `Match` oluşturulur, `GameService.initializeGame` çağrılır ve oyunculara eşleşme bilgisi iletilir.
  - Aynı cihazdan/fingerprint'ten iki hesabın kuyruğa girmesi engellenmelidir (hakkında bkz. Bölüm 8.2 & 15).
  - Aynı IP'den gelen eşleşmeler "Friendly" maç olarak işaretlenmeli ve ELO'ya etki etmemelidir.

### Bağlam Dosyaları
- `docs/spec.md` → Bölüm 7.1, 8.2, 15, 19.4
- `.antigravity/skills/websocket.md` → WebSocket yazma standartları

### Kabul Kriterleri
- [ ] Davet gönderildiğinde 30 saniye içinde cevap gelmezse `lobby:invite_timeout` tetiklenmeli
- [ ] Kuyruktaki oyuncular 120 saniyede eşleşmezse `lobby:queue_timeout` ile kuyruktan çıkarılmalı
- [ ] Aynı fingerprint ile kuyruğa girmeye çalışıldığında `lobby:error` dönmeli
- [ ] Aynı IP'den eşleşen oyuncuların maçları `isFriendly: true` olarak kaydedilmeli
- [ ] `npm run test -w backend` tüm testlerden geçmeli
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı

### Onay Durumu
- [ ] Ajan testleri / derleme geçti
- [ ] İnsan inceledi ve onayladı
- [ ] feature/lobby-gateway branch'ten develop'a merge edildi
