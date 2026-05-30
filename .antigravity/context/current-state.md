# Projenin Anlık Durumu

Son Güncelleme: 2026-05-30
Aktif Branch: feature/user

---

## Genel İlerleme

```
Faz 1 MVP: █████░░░░░ %50
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
| Game Gateway | 🔍 İnsan İncelemesinde | feature/game-gateway | WebSocket gateway, reconnect penceresi ve turn timer tamamlandı. |
| Lobby Gateway | ⬜ Başlanmadı | — | — |

### Frontend
| Modül | Durum | Branch | Notlar |
|-------|-------|--------|--------|
| Store'lar + API katmanı | ⬜ Başlanmadı | — | — |
| Auth Sayfaları | ⬜ Başlanmadı | — | — |
| Lobi Sayfası | ⬜ Başlanmadı | — | — |
| Oyun Tahtası (statik) | ⬜ Başlanmadı | — | — |
| Animasyon Katmanı | ⬜ Başlanmadı | — | — |

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
Oturum 2026-05-30 — Game Gateway (Aşama 7)

### Yapılanlar
- `/game` namespace altında `GameGateway` WebSocket ağ geçidi kuruldu.
- JWT handshake/query token doğrulaması yapıldı.
- 15 saniyelik hamle süresi (turn timer) ve sırası olan oyuncu koptuğunda timer'ı dondurma mantığı sunucuda koşturuldu.
- Oyuncu koptuğunda 60 saniyelik reconnect penceresi yönetildi; aşımında hükmen yenilgi ve ELO cezası (+15/-15) tetiklendi.
- Hamlelerin `MoveHistory` tablosuna kaydedilmesi ve ELO güncellemeleri entegre edildi.
- XSS korumalı sanitasyon ile sohbet (`game:message`) ve sohbet kilitleri (`game:chat_toggle`) geliştirildi.
- Jest birim testleri (21 test) eklenerek gateway ve service için coverage hedefleri (>%70) aşıldı, tüm tsc derlemesi başarıyla tamamlandı.
