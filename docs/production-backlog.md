# MANGALA PRIME — YAYIN ÖNCESİ EKSİKLER & YOL HARİTASI (PRODUCTION BACKLOG)

> **Not:** Bu doküman ilk yayın öncesi hazırlanan özet listedir. Güncel, bağlayıcı mimari inceleme, karar kayıtları (K-1…K-7) ve görev listesi (T-01…T-16) için **`docs/architecture-roadmap.md`** dokümanına bakınız.

Bu doküman, Mangala Prime web platformunun canlıya ve genel kullanıma açılabilmesi için yapılması gereken teknik, güvenlik, oynanış ve kullanıcı deneyimi (UX) geliştirmelerini içerir.

---

## 1. Yüksek Öncelikli (Güvenlik & Kararlılık) — ✅ TAMAMLANDI (Faz A: T-01…T-07)

### 1.1 ✅ CORS ve Güvenlik Başlıkları Sertleştirmesi (Tamamlandı: T-04, T-05)
- **Durum:** `ConfiguredIoAdapter` ile HTTP ve WebSocket CORS politikası `AppConfig.corsOrigins` beyaz listesi altında birleştirildi (`PR #28`). `helmet` (PixiJS/WS uyumlu CSP), `@nestjs/throttler` ve WS `SlidingWindowLimiter` devreye alındı (`PR #29`).

### 1.2 ✅ Ortam Değişkenleri & JWT Gizliliği (Tamamlandı: T-01, T-02, T-03)
- **Durum:** Tipli `AppConfig` ve `ConfigModule` ile fail-fast secret doğrulaması eklendi; tüm `fallback_...` JWT secret'ları kaldırıldı (`PR #26`). Sızan şifreler döndürüldü (`PR #25`) ve `/test-match` debug endpoint'i kaldırılıp `GET /health` eklendi (`PR #27`).

### 1.3 ✅ CI/CD Veri Güvenliği (`--accept-data-loss` Kaldırılması) (Tamamlandı: PR #23, T-07)
- **Durum:** Prodüksiyon deploy adımı `npx prisma migrate deploy` olarak güncellendi ve `prisma.config.ts` kök dizinde tekilleştirildi (`PR #31`).

### 1.4 ✅ Kod Tabanı `any` Temizliği (AGENTS.md Anayasa Uyumu) (Tamamlandı: T-06)
- **Durum:** Kod tabanındaki tüm `any` kullanımları kaldırıldı (`grep` sonucu: `0`), ESLint `@typescript-eslint/no-explicit-any: 'error'` açıldı ve CI'a `npm run lint` kapısı eklendi (`PR #30`).

---

## 2. Orta Öncelikli (Oyun Deneyimi & İçerik)

### 2.1 ✅ Local PvP Modu (Aynı Cihazda İki Kişi) (Tamamlandı: PR #23)
- **Durum:** Lobi ekranına "Tek Cihazda 2 Kişi Oyna (Yerel PvP)" modu eklendi ve `GamePage` / `GameStore` ile entegre edildi. Ortak oyun motoru tekilleştirmesi **T-08** kapsamında yapılacaktır.

### 2.2 Liderlik Tablosu (Leaderboard) & Profil Arayüzü
- **Mevcut Durum:** Backend `/users/leaderboard` ve `/users/:username` hazır, ancak frontend'de ekranı yok.
- **Yapılacaklar:**
  1. Lobi veya üst menüye "Liderlik Tablosu" modalı veya sayfası ekle (Top 20 ELO listesi, galibiyet/mağlubiyet oranları).
  2. Kullanıcının kendi maç geçmişini (galibiyet/mağlubiyet/tarih) görebileceği profil sekmesi ekle.
- **Etkilenecek Dosyalar:**
  - `frontend/src/components/LeaderboardModal.tsx` (Yeni)
  - `frontend/src/components/ProfileModal.tsx` (Yeni)
  - `frontend/src/App.tsx`
  - `frontend/src/components/LobbyPage.tsx`

### 2.3 Basit Bot / Yapay Zeka (PvE) Modu
- **Mevcut Durum:** Sadece online PvP var. Lobi boş olduğunda oyuncu beklemek zorunda kalıyor.
- **Yapılacaklar:**
  1. "Mangala Botu ile Oyna (Alıştırma)" modu ekle (Kural bazlı: önce hazineye düşen hamleleri, sonra çiftleme/Turan hamlelerini seçen akıllı heuristic motor).
- **Etkilenecek Dosyalar:**
  - `frontend/src/lib/bot-engine.ts` (Yeni)
  - `frontend/src/components/LobbyPage.tsx`

---

## 3. Düşük Öncelikli (Cila, SEO & Frontend Testleri)

### 3.1 Başlık, Favicon & SEO İyileştirmeleri
- **Mevcut Durum:** `frontend/index.html` başlığı `<title>frontend</title>`.
- **Yapılacaklar:**
  1. Başlığı `Mangala Prime — Online Türk Zeka Oyunu` olarak güncelle.
  2. Meta descriptions, Open Graph (OG) kartları ve sosyal medya görseli ekle.
  3. PWA manifest / favicon yapılandırmasını tamamla.
- **Etkilenecek Dosyalar:**
  - `frontend/index.html`

### 3.2 Frontend Birim ve Bileşen Testleri
- **Mevcut Durum:** `frontend` test scripti `echo 'No tests for frontend'`.
- **Yapılacaklar:**
  1. Vitest + React Testing Library kur.
  2. Router, auth store ve oyun store'u için kritik testleri yaz.
- **Etkilenecek Dosyalar:**
  - `frontend/package.json`
  - `frontend/src/stores/game.store.spec.ts` (Yeni)

### 3.3 Rövanş (Rematch) Özelliği
- **Mevcut Durum:** Oyun bitince sadece "Lobiye Dön" var.
- **Yapılacaklar:**
  1. Oyun sonu modalına "Rövanş Teklif Et" butonu ekle.
  2. İki oyuncu da kabul ederse odayı yeni maçla sıfırla.
