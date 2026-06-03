# Projenin Anlık Durumu

Son Güncelleme: 2026-06-03
Aktif Branch: develop

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
Oturum 2026-06-03 — Lobi Kullanıcı Listesi Senkronizasyon ve Proxy IP Düzeltmesi (Bugfix)

### Yapılanlar
- Lobi sayfasında diğer kullanıcıların adlarının "User_xxxx" şeklinde görünmesi ve sayfa yenilendiğinde isim senkronizasyonunun kaybolması hatası çözüldü.
- `lobby:user_status` WebSocket olayı güncellenerek kullanıcı adı ve ELO skorlarının yayına dahil edilmesi sağlandı.
- Nginx Proxy Manager gibi ters proxy (reverse proxy) arkasında çalışan ortamlarda istemci IP adreslerinin doğru elde edilebilmesi için `x-forwarded-for` ve `x-real-ip` başlıklarını okuma desteği ile IPv6 `::ffff:` önekini temizleme mantığı eklendi. Böylece aynı local ağdan oynanan maçların "isFriendly = true" olarak doğru tespit edilmesi ve ELO kazanımının engellenmesi sağlandı.
- Testler ve build doğrulandı. `docs/session-log.md` güncellendi.
