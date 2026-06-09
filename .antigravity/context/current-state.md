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
Oturum 2026-06-10 — PixiJS Tahta Ardışık Dağıtım ve Fiziksel Yerleşim Animasyon Düzeltmesi

### Yapılanlar
- `MangalaReactBoard.tsx` bileşenine array referans değişikliklerini tolere etmesi için `arraysEqual` yardımcı fonksiyonu eklendi ve value-equality kontrolü sağlandı.
- `MangalaBoard.ts` içindeki `runSowingAnimation` metodu, uçuş (`x`, `y`) ve parabolik yükseklik (`flightZ`) tweens'lerini tek bir ana GSAP timeline (`tl`) üzerinde birleştirilerek refaktör edildi.
- `checkAnimationSettle` metoduna `finalBoardState` parametresi eklenerek toplam taş sayısının doğruluğu (`currentStonesCount === totalTargetStones`) kontrol edilmeye başlandı ve havada uçuş halinde olan taşlar varken animasyonun erken sonlanması engellendi.
- `tickPhysics` simülasyon döngüsü güncellenerek fizik motoru ile yer değiştiren ve sarsılan bilyelerin scale/shadow/Z yükseklik görsel özelliklerinin güncel kalması sağlandı.
- Monorepo derlemesi (`npm run build`) ve tüm 74 birim testi (`npm run test`) başarıyla doğrulandı.

