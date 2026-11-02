# Projenin Anlık Durumu

Aktif Branch: feature/leaderboard-profile-ui

---

## Genel İlerleme

```
Faz 1 MVP: ██████████ %100
Yayın Hazırlığı: ██████████ %100 (v1.0.0 Yayınlandı — Faz A & Faz C tamamlandı, bkz. docs/architecture-roadmap.md)
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
- **✅ ÇÖZÜLDÜ (B-12 / T-10):** `develop` → `main` (`v1.0.0`) release yapıldı ve 19 eski branch temizlendi.
- **✅ ÇÖZÜLDÜ (B-13 / T-12):** `AGENTS.md`, `docs/spec.md`, `.antigravity/skills/prisma.md`, `REVIEW_CHECKLIST.md` ve `docs/production-backlog.md` gerçek mimariyle senkronize edildi.
- **✅ ÇÖZÜLDÜ (B-08 / T-08):** Saf Mangala oyun motoru `shared/engine/mangala-engine.ts` altında tekilleştirildi; `frontend/src/lib/game-engine.ts` kaldırıldı.
- **✅ ÇÖZÜLDÜ (B-11 / T-11):** `WsExceptionFilter` (`backend/src/common/filters/ws-exception.filter.ts`) eklendi; `GameGateway` ve `LobbyGateway` üzerindeki tekrarlayan `try/catch` hata yayınları filtreye devredildi.
- **✅ ÇÖZÜLDÜ (B-10 / T-09):** Frontend Vitest + Testing Library altyapısı kuruldu; `auth.store`, `api-client`, `game.store` ve `AuthGuard` için 12 birim testi eklendi; `auth.store` Spec 11.1 uyarınca salt-bellek (memory) moduna alındı. Faz B tamamlandı.
- **✅ ÇÖZÜLDÜ (T-13):** `LeaderboardModal` ve `ProfileModal` bileşenleri 4 tema ve mobil tam ekran uyumlu olarak eklendi; 7 yeni Vitest birim testiyle doğrulandı.
- **Mimari Kararlar:** K-1…K-7 tamamı 2026-10-31'de onaylandı.

---

## Tamamlanan Son Oturum
Oturum 2026-11-02 — T-13: Liderlik Tablosu ve Profil Arayüzü

### Yapılanlar
- `LeaderboardModal.tsx` ve `ProfileModal.tsx` bileşenleri oluşturuldu ve üst bara bağlandı.
- `LeaderboardModal.spec.tsx` (4 test) ve `ProfileModal.spec.tsx` (3 test) eklendi.
- 122/122 birim testi (103 backend + 19 frontend), lint ve build doğrulandı. Sıradaki görev: T-14.
