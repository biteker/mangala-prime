# Projenin Anlık Durumu

Son Güncelleme: 2026-05-30
Aktif Branch: feature/game-page

---

## Genel İlerleme

```
Faz 1 MVP: █████████░ %90
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
| Animasyon Katmanı | 🔍 İnsan İncelemesinde | feature/game-page | Kuyu bazlı ardışık dağıtım animasyonu, tıklama kilidi (input-lock) ve kuyu büyüme efektleri tamamlandı. |

### Altyapı
| Modül | Durum | Notlar |
|-------|-------|--------|
| GitHub Actions CI/CD | ⬜ Başlanmadı | — |
| Hetzner Deploy | ⬜ Başlanmadı | — |

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
Oturum 2026-05-31 — Frontend Animasyon Katmanı (Aşama 13)

### Yapılanlar
- Taşların sırayla saat yönünün tersine 175ms aralıklarla dağıtılmasını sağlayan ardışık animasyon mekanizması (`GamePage.tsx` local state ile) kodlandı.
- Animasyon esnasında tıklamaları ve imleçleri engelleyen kilit yapısı (`isAnimating` + `.input-locked`) uygulandı.
- Taşın düştüğü aktif kuyu ve haznelere hafif büyüme/parıldama kazandıran `@keyframes drop-pulse` ve `.animate-drop` CSS kuralları eklendi.
- Oyun sonu modalının, animasyonlar bitene kadar açılmasını erteleyen `showGameOverModal` yapısı entegre edildi.
- Monorepo genelinde `npm run build` ve `npm run test` başarıyla koşturulup doğrulandı.
