# Projenin Anlık Durumu

Aktif Branch: feature/prisma-config-single-source

---

## Genel İlerleme

```
Faz 1 MVP: ██████████ %100
Yayın Hazırlığı: ██████████ %95  (Faz A: T-01..T-07 tamamlandı — bkz. docs/architecture-roadmap.md)
```

---

## Modül Durumları

### Backend
| Modül | Durum | Branch | Notlar |
|-------|-------|--------|--------|
| Tip Tanımları | ✅ Onaylandı ve Merge Edildi | develop | Geliştirme tamamlandı, merge edildi. |
| Prisma Şeması | ✅ Onaylandı ve Merge Edildi | develop | PostgreSQL / Prisma 7 entegrasyonu tamamlandı. |
| ELO Servisi | ✅ Onaylandı ve Merge Edildi | develop | Saf ELO hesaplama formülleri ve transaction güncellemeleri tamamlandı. |
| Oyun Motoru | ✅ Onaylandı ve Merge Edildi | develop | Saf Mangala kural seti tamamlandı, tüm testler geçiyor. |
| Auth Modülü | ✅ Onaylandı ve Merge Edildi | develop | JWT kimlik doğrulama, cookie refresh rotasyonu ve testleri tamamlandı. |
| User Modülü | ✅ Onaylandı ve Merge Edildi | develop | Profil, liderboard ve maç geçmişi backend servisleri tamamlandı. |
| Game Gateway | ✅ Onaylandı | feature/fix-test-and-backlog | WebSocket gateway, reconnect penceresi ve turn timer senkronizasyonu tamamlandı. |
| Lobby Gateway | ✅ Onaylandı ve Merge Edildi | develop | WebSocket lobi, FIFO matchmaking kuyruğu, davet sistemi ve hile engelleme tamamlandı. |

### Frontend
| Modül | Durum | Branch | Notlar |
|-------|-------|--------|--------|
| Store'lar + API katmanı | ✅ Onaylandı ve Merge Edildi | develop | Zustand store'ları ve Axios API istemcisi tamamlandı. |
| Auth Sayfaları | ✅ Onaylandı ve Merge Edildi | develop | Giriş, kayıt formları, AuthGuard ve tema entegrasyonu tamamlandı. |
| Lobi Sayfası | ✅ Onaylandı | feature/fix-test-and-backlog | Canlı lobi listesi, davetler, hızlı maç ve "Tek Cihazda 2 Kişi Oyna (Yerel PvP)" butonu eklendi. |
| Oyun Tahtası (canlı) | ✅ Onaylandı | feature/fix-test-and-backlog | PixiJS tahta motoru, Web Audio sentezleyicisi ve hem Online hem Local PvP modları bağlandı. |
| Animasyon ve Tema Katmanı | ✅ Onaylandı ve Merge Edildi | develop | Ardışık taş dağıtım animasyonu, bilye fiziği ve 4 tema tamamlandı. |

### Altyapı & Devops
| Modül | Durum | Notlar |
|-------|-------|--------|
| GitHub Actions CI/CD | ✅ Onaylandı | Testler yeşil (74/74). `prisma migrate deploy` ile güvenli dağıtım sağlandı. |
| Hetzner Deploy | ✅ Onaylandı ve Merge Edildi | Docker, Compose ve Nginx Proxy Manager ile VPS üzerinde deploy doğrulandı. |
| Güvenlik Sertleştirmesi | ✅ Onaylandı | Faz A (T-01…T-07): Tipli config, debug endpoint temizliği, şifre rotasyonu, birleşik CORS, Helmet + Rate limiting, sıfır `any` + CI lint kapısı ve Prisma config tekilleştirme tamamlandı. |

---

## Durum Efsanesi
- ⬜ Başlanmadı
- 🔄 Devam Ediyor
- 🔍 İnsan İncelemesinde
- ✅ Onaylandı ve Merge Edildi

---

## Bilinen Sorunlar / Açık Kararlar
- **Karar:** Local PvP modu tarayıcı üzerinde yerel `processLocalMove` saf fonksiyonu ile çalışır, backend bağlantısı gerektirmez.
- **Karar:** Turn timer testi dinamik limit (`service.getTurnTimeLimit()`) ile çalışır.
- **Backlog:** Detaylı yayın öncesi eksik listesi `docs/production-backlog.md` dokümanında listelenmiştir.
- **Mimari Yol Haritası:** `docs/architecture-roadmap.md` (2026-10-30) — bağlayıcı görev listesi (T-01…T-16). Görevler bu sırayla yürütülür.
- **✅ ÇÖZÜLDÜ (B-01 / B-14 / T-02):** `POST /test-match` ve `ws-test.html` kaldırıldı; `GET /health` eklendi.
- **✅ ÇÖZÜLDÜ (B-02 / T-01):** Tipli `AppConfig` ve fail-fast doğrulama eklendi; tüm JWT fallback secret'ları kaldırıldı.
- **✅ ÇÖZÜLDÜ (B-03 / T-03):** VPS ve yerel Postgres şifreleri değiştirildi, repo dosyalarındaki sızmış şifre temizlendi.
- **✅ ÇÖZÜLDÜ (B-04 / B-05 / T-04):** `ConfiguredIoAdapter` ile HTTP ve WebSocket CORS politikası `AppConfig.corsOrigins` altında birleştirildi.
- **✅ ÇÖZÜLDÜ (B-06 / T-05):** `helmet` CSP, HTTP `@nestjs/throttler` ve WS `SlidingWindowLimiter` devreye alındı.
- **✅ ÇÖZÜLDÜ (B-07 / T-06):** Kod tabanındaki tüm `any` kullanımları kaldırıldı, ESLint `no-explicit-any: error` ve CI `npm run lint` kapısı eklendi.
- **✅ ÇÖZÜLDÜ (B-09 / T-07):** `prisma/prisma.config.ts` silinerek kök `/prisma.config.ts` tek kaynak yapıldı; DB URL fallback'i kaldırıldı.
- **Mimari Kararlar:** K-1…K-7 tamamı 2026-10-31'de onaylandı (K-4: yalnızca şifre rotasyonu).

---

## Tamamlanan Son Oturum
Oturum 2026-11-01 — T-07: Prisma Config Tekilleştirme

### Yapılanlar
- `prisma/prisma.config.ts` silindi; kökteki `/prisma.config.ts` içinde `env('DATABASE_URL')` zorunlu kılındı ve fallback kaldırıldı.
- `backend/package.json` içindeki mükerrer `prisma.seed` alanı temizlendi; CI ve `Dockerfile` `prisma generate` adımları güncellendi.
- `npx prisma validate`, `npx prisma migrate deploy`, 94/94 birim testi ve monorepo build doğrulandı. Sıradaki görev: T-10.
