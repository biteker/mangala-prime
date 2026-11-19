# Sıradaki Görev

---

## Görev: T-18 — Güvenilir Okul IP Kuralı & Admin Dashboard

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 8.5 (K-8, K-10).

### Ön Koşullar
- [x] T-17 (`feature/tournament-schema-roles`) tamamlandı.

### Branch
`feature/admin-dashboard-school-ip` (base: `develop`)

### Ne Yapılacak?
1. **Güvenilir Okul IP Kuralı (`LobbyService` & `GameService`):**
   - `p1.ip === p2.ip` durumunda `TrustedSchoolIp` tablosunda aktif kayıt varsa (ve son 24 saatte aynı iki oyuncu arasındaki puanlı maç sayısı sistem limitinin altındaysa) maç `isFriendly = false` (puanlı) olarak açılır.
   - Güvenilir okul IP listesinde olmayan aynı IP eşleşmelerinde mevcut anti-hile kuralı (`isFriendly = true`) aynen korunur.
2. **Admin Backend Modülü (`backend/src/admin/`):**
   - Yalnızca `@Roles('ADMIN')` erişimli REST endpoint'leri:
     - `GET /admin/my-ip`: İstek yapanın gerçek IP adresini döndürür (okulda tek tıkla ekleme kolaylığı).
     - `GET/POST/PATCH/DELETE /admin/school-ips`: Güvenilir okul IP CRUD.
     - `GET /admin/users`, `PATCH /admin/users/:id/role`, `POST /admin/users/:id/reset-password`: Kullanıcı arama, rol/okul atama, şifre sıfırlama.
     - `GET/PATCH /admin/settings`: Genel ayarlar (`schoolDailyRankedPairLimit`, vb.).
3. **Admin Dashboard Frontend (`frontend/src/components/AdminPage.tsx`):**
   - `#/admin` rotası ve üst barda yalnızca `ADMIN` kullanıcısına görünen "🛡️ Admin Paneli" butonu.
   - Okul IP Yönetimi (mevcut IP'yi tek tıkla ekleme dahil), Kullanıcı & Rol Yönetimi, Şifre Sıfırlama ve Sistem Ayarları sekmeleri.
4. **Testler:**
   - Okul IP kuralı + Admin servis birim testleri.
