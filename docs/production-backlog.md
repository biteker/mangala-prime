# MANGALA PRIME — YAYIN ÖNCESİ EKSİKLER & YOL HARİTASI (PRODUCTION BACKLOG)

Bu doküman, Mangala Prime web platformunun canlıya ve genel kullanıma açılabilmesi için yapılması gereken teknik, güvenlik, oynanış ve kullanıcı deneyimi (UX) geliştirmelerini içerir.

---

## 1. Yüksek Öncelikli (Güvenlik & Kararlılık)

### 1.1 CORS ve Güvenlik Başlıkları Sertleştirmesi
- **Mevcut Durum:** `backend/src/main.ts` içinde `app.enableCors({ origin: true, credentials: true })` tanımlı. Helmet ve Rate limiting yok.
- **Yapılacaklar:**
  1. `origin` parametresini `process.env.CORS_ORIGIN` (örnek: `https://mangala-prime.egitimhaber.gen.tr,http://localhost:5173`) ile whitelist'e al.
  2. `helmet` paketini ekle ve temel HTTP güvenlik başlıklarını aç.
  3. `@nestjs/throttler` ile `/auth/login`, `/auth/register` ve socket bağlantılarına rate limiting uygula (brute-force koruması).
- **Etkilenecek Dosyalar:**
  - `backend/src/main.ts`
  - `backend/src/app.module.ts`
  - `backend/package.json`

### 1.2 Ortam Değişkenleri & JWT Gizliliği
- **Mevcut Durum:** `backend/.env.example` içinde `JWT_SECRET` ve `JWT_REFRESH_SECRET` yok; kod içinde hardcoded dev string fallback'leri var.
- **Yapılacaklar:**
  1. `backend/.env.example` dosyasına `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `PORT`, `NODE_ENV` değişkenlerini ekle.
  2. `auth.service.ts` ve `game.gateway.ts` içinde fallback kullanımını logla veya prodüksiyonda bu değişkenler tanımlı değilse sunucunun başlamasını engelleyecek kontrol koy.
- **Etkilenecek Dosyalar:**
  - `backend/.env.example`
  - `backend/src/auth/auth.service.ts`
  - `backend/src/game/game.gateway.ts`

### 1.3 CI/CD Veri Güvenliği (`--accept-data-loss` Kaldırılması)
- **Mevcut Durum:** `.github/workflows/ci-cd.yml` içinde `npx prisma db push --accept-data-loss` çalıştırılıyor.
- **Risk:** Şema değişikliklerinde kullanıcı/maç verilerinin silinme riski.
- **Yapılacaklar:**
  1. Prodüksiyon deploy adımını `npx prisma migrate deploy` olarak güncelle.
- **Etkilenecek Dosyalar:**
  - `.github/workflows/ci-cd.yml`

### 1.4 Kod Tabanı `any` Temizliği (AGENTS.md Anayasa Uyumu)
- **Mevcut Durum:** Birkaç dosyada `any` tipi kullanılmış.
- **Düzeltilecek Yerler:**
  - `backend/src/auth/auth.controller.ts` (satır 63: `@Req() req: AuthenticatedRequest`)
  - `backend/src/user/user.controller.ts` (satır 11: `@Req() req: AuthenticatedRequest`)
  - `frontend/src/components/GamePage.tsx` (satır 140: HTML fullscreen cross-browser tipi)
  - `frontend/src/components/MangalaBoard/audio.ts` (satır 26: WebKit AudioContext tipi)

---

## 2. Orta Öncelikli (Oyun Deneyimi & İçerik)

### 2.1 Local PvP Modu (Aynı Cihazda İki Kişi)
- **Mevcut Durum:** Spec Bölüm 4.6'da tarif edilen Local PvP modu henüz arayüze eklenmedi. Tek başına giren kullanıcı lobide eşleşme bulamazsa oyunu oynayamıyor.
- **Yapılacaklar:**
  1. Lobi ekranına "Tek Cihazda 2 Kişi Oyna (Local PvP)" butonu ekle.
  2. WebSocket gerektirmeden, doğrudan `GameEngineService` kural setini veya frontend yerel motorunu kullanarak aynı tarayıcıda sıra bazlı oynanış sağla.
  3. P1 (alt sıra 0-5) ve P2 (üst sıra 7-12) sırası geldikçe tahtada ilgili kuyuları interaktif yap.
- **Etkilenecek Dosyalar:**
  - `frontend/src/components/LobbyPage.tsx`
  - `frontend/src/components/GamePage.tsx`
  - `frontend/src/stores/game.store.ts`

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
