# Projenin Anlık Durumu

Aktif Branch: feature/architecture-roadmap

---

## Genel İlerleme

```
Faz 1 MVP: ██████████ %100
Yayın Hazırlığı: ██████░░░░ %60  (mimari denetimde kritik güvenlik bulguları — bkz. docs/architecture-roadmap.md)
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
- **🔴 KRİTİK (B-01):** `POST /test-match` kimlik doğrulamasız, canlıda açık. → T-02
- **🔴 KRİTİK (B-02):** JWT secret'larında hardcoded fallback (6 yer). → T-01
- **✅ ÇÖZÜLDÜ (B-03 / T-03):** VPS ve yerel Postgres şifreleri değiştirildi, repo dosyalarındaki sızmış şifre temizlendi.
- **🟠 (B-04/B-07):** WS gateway CORS `origin: '*'`; `lobby.gateway.ts` içinde `as any`, ESLint'te `no-explicit-any` kapalı. → T-04, T-06
- **Mimari Kararlar:** K-1…K-7 tamamı 2026-10-31'de onaylandı (K-4: yalnızca şifre rotasyonu). T-01 başlatılabilir.

---

## Tamamlanan Son Oturum
Oturum 2026-10-30 — Mimari Denetim ve Yol Haritası (Sistem Mimarı)

### Yapılanlar
- Kod tabanının mimari denetimi yapıldı; 14 bulgu (3 kritik) `docs/architecture-roadmap.md` Bölüm 1'e kaydedildi.
- 7 onay gerektiren mimari karar (K-1…K-7) ve 16 görev (T-01…T-16) tasarlandı.
- Kod değişikliği yapılmadı. Sıradaki görev: T-01.
