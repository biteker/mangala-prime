# Projenin Anlık Durumu

Aktif Branch: feature/unified-cors

---

## Genel İlerleme

```
Faz 1 MVP: ██████████ %100
Yayın Hazırlığı: ████████░░ %80  (T-01, T-02, T-03 ve T-04 tamamlandı — bkz. docs/architecture-roadmap.md)
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
| Güvenlik Sertleştirmesi | 🔄 Devam Ediyor | Yalnızca HTTP `CORS_ORIGIN` whitelist yapıldı. Eksikler: JWT fallback secret'ları, WS CORS `*`, Helmet/rate limit yok, `/test-match` açık. → Roadmap Faz A (T-01…T-07) |

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
- **🟠 (B-07):** `lobby.gateway.ts` içinde `as any`, ESLint'te `no-explicit-any` kapalı. → T-06
- **Mimari Kararlar:** K-1…K-7 tamamı 2026-10-31'de onaylandı (K-4: yalnızca şifre rotasyonu). T-01 başlatılabilir.

---

## Tamamlanan Son Oturum
Oturum 2026-11-01 — T-04: Birleşik CORS Politikası (HTTP + WebSocket)

### Yapılanlar
- `ConfiguredIoAdapter` oluşturuldu ve `main.ts` içinde WebSocket adapter olarak bağlandı.
- `GameGateway` ve `LobbyGateway` üzerindeki `origin: '*'` kaldırıldı (`grep origin: '*'|origin: true` → 0 sonuç).
- 84/84 birim testi ve monorepo build doğrulandı. Sıradaki görev: T-05.
