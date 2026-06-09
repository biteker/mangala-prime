# Projenin Anlık Durumu

Aktif Branch: pixijs

---

## Genel İlerleme

```
Faz 1 MVP: ██████████ %100
```

---

## Modül Durumları

### Backend
| Modül | Durum | Branch | Notlar |
|-------|-------|--------|--------|
| Tip Tanımları | ✅ Onaylandı ve Merge Edildi | develop | Geliştirme tamamlandı, merge edildi. |
| Prisma Şeması | ✅ Onaylandı ve Merge Edildi | develop | SQLite veritabanı kuruldu, test verileri seed edildi ve NestJS modülü bağlandı. |
| ELO Servisi | ✅ Onaylandı ve Merge Edildi | develop | Saf ELO hesaplama formülleri ve transaction güncellemeleri tamamlandı, unit testleri yazıldı. |
| Oyun Motoru | ✅ Onaylandı ve Merge Edildi | develop | Saf Mangala kural seti ve processMove mantığı tamamlandı, 8 zorunlu test geçti. |
| Auth Modülü | ✅ Onaylandı ve Merge Edildi | develop | JWT kimlik doğrulama, cookie refresh rotasyonu, error/data sarmalayıcıları ve testleri tamamlandı. |
| User Modülü | ✅ Onaylandı ve Merge Edildi | develop | Profil, liderboard ve maç geçmişi tamamlandı. |
| Game Gateway | ✅ Onaylandı ve Merge Edildi | develop | WebSocket gateway, reconnect penceresi ve turn timer tamamlandı. |
| Lobby Gateway | ✅ Onaylandı ve Merge Edildi | develop | WebSocket lobi, FIFO matchmaking kuyruğu, davet sistemi ve hile engelleme tamamlandı. |

### Frontend
| Modül | Durum | Branch | Notlar |
|-------|-------|--------|--------|
| Store'lar + API katmanı | ✅ Onaylandı ve Merge Edildi | develop | Zustand store'ları ve Axios API istemcisi tamamlandı. |
| Auth Sayfaları | ✅ Onaylandı ve Merge Edildi | develop | Giriş, kayıt formları, AuthGuard ve tema entegrasyonu tamamlandı. |
| Lobi Sayfası | ✅ Onaylandı ve Merge Edildi | develop | Canlı lobi oyuncu listesi, meydan okuma modalları ve hızlı eşleşme sırası tamamlandı. |
| Oyun Tahtası (canlı) | ✅ Onaylandı ve Merge Edildi | feature/game-page → develop | Hata düzeltmesi tamamlandı: yourColor/currentPlayerId null bug, StrictMode uyumluluğu, reconnect state sync. |
| Animasyon ve Tema Katmanı | ✅ Onaylandı ve Merge Edildi | develop | Ardışık taş dağıtım animasyonu, input-lock kilidi, premium ahşap tema ve mobil uyumluluklar tamamlandı. |

### Altyapı
| Modül | Durum | Notlar |
|-------|-------|--------|
| GitHub Actions CI/CD | ✅ Onaylandı ve Merge Edildi | GitHub Actions test, build, docker build ve SSH VPS deploy workflow'u kuruldu ve çalıştırıldı. |
| Hetzner Deploy | ✅ Onaylandı ve Merge Edildi | Docker, Compose ve Nginx Proxy Manager ile VPS üzerinde otomatik deploy ve prisma db push işlemleri doğrulandı. |

---

## Durum Efsanesi
- ⬜ Başlanmadı
- 🔄 Devam Ediyor
- 🔍 İnsan İncelemesinde
- ✅ Onaylandı ve Merge Edildi

---

## Bilinen Sorunlar / Açık Kararlar
- **Karar:** Tip tanımları `/shared/types/` altında ortaklaştırılarak monorepo yapısında yönetilecek.
- **Karar:** Local PvP modunda aynı cihaz/fingerprint engellemesi bypass edilecek, hile koruması yalnızca Hızlı Maç modunda etkin olacak.
- **Karar:** `GameRoom` tipi backend-only — `shared/` dışında, `/backend/src/game/types/game-room.types.ts` içinde tanımlanacak.
- **Karar:** `MoveResult.winner` tipi `0 | 1` (Player) olacak — saf fonksiyon userId bilemez.
- **Karar:** Matchmaking MVP'de FIFO kuyruk, Faz 2'de ELO tabanlı eşleşme.
- **Karar:** 3D efektler saf CSS ile sağlanacak (Three.js vb. kullanılmayacak).
- **Karar:** Çoklu tema desteği (Açık/Koyu ve bambaşka görsel varyasyonlar) CSS değişkenleri ve Zustand Store ile yönetilecek, harici tema motoru kurulmayacaktır.

---

## Tamamlanan Son Oturum
Oturum 2026-06-10 — PixiJS Tahta Entegrasyonu ve Tema İsimlendirme Güncellemesi

### Yapılanlar
- PixiJS tabanlı `MangalaReactBoard` bileşeni, React arayüzüne ve Zustand/WebSocket oyun akışına başarıyla entegre edildi.
- Zustand store'daki `board` dizisi güncellendiğinde, önceki durum ile karşılaştırılarak hamlenin `startPit` ve `steps` bilgileri istemci tarafında hesaplanıp PixiJS tahtasına `lastMove` prop'u olarak paslandı. Ayrıca `boardState` ve `lastMove` proplarının farklı render adımlarında güncellenmesinden kaynaklanan animasyon atlama/safeguard sorununu çözmek için bu iki veri React tarafında tek bir `boardData` yerel state'i altında birleştirilerek tek render aşamasında PixiJS'e iletildi.
- Sıra bizdeyken tıklanabilir kuyuların dizisi (`clickablePits`) dinamik olarak filtrelendi ve ELO etiketleri ile isimleri (`p1Info` ve `p2Info`) oyuncunun rengine göre tahtaya aktarıldı.
- Son eklenen premium tema `theme-rustic-v0` ismi ve tüm CSS sınıfları `theme-pixijs` ("PixiJS") olarak değiştirildi ve oyunun ilk açılışta bu temayla başlaması sağlandı.
- Monorepo derlemesi (`npm run build`) ve tüm 74 birim testi (`npm run test`) başarıyla doğrulandı.

