# Projenin Anlık Durumu

Son Güncelleme: 2026-05-30
Aktif Branch: feature/prisma

---

## Genel İlerleme

```
Faz 1 MVP: ██░░░░░░░░ %14
```

---

## Modül Durumları

### Backend
| Modül | Durum | Branch | Notlar |
|-------|-------|--------|--------|
| Tip Tanımları | ✅ Onaylandı ve Merge Edildi | develop | Geliştirme tamamlandı, merge edildi. |
| Prisma Şeması | 🔍 İnsan İncelemesinde | feature/prisma | SQLite veritabanı kuruldu, test verileri seed edildi ve NestJS modülü bağlandı. |
| ELO Servisi | ⬜ Başlanmadı | — | — |
| Oyun Motoru | ⬜ Başlanmadı | — | — |
| Auth Modülü | ⬜ Başlanmadı | — | — |
| User Modülü | ⬜ Başlanmadı | — | — |
| Game Gateway | ⬜ Başlanmadı | — | — |
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
Oturum 2026-05-30 — Prisma Veritabanı ve Şema Kurulumu (feature/prisma)
