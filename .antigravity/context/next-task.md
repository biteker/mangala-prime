# Sıradaki Görev

---

## Görev: User (Kullanıcı ve Liderlik Tablosu) Modülü (Aşama 6/14)

### Ne Yapılacak?
Kullanıcının kendi profil bilgilerini almasını, liderlik tablosunun (leaderboard) listelenmesini ve kullanıcı adına göre profil aranmasını sağlayan `UserModule` bileşenlerini NestJS backend bünyesinde geliştir.

### Oluşturulacak Dosyalar

**Backend:**
```
/backend/src/user/user.module.ts
/backend/src/user/user.controller.ts
/backend/src/user/user.service.ts
/backend/src/user/user.service.spec.ts
```

### İçerik Gereksinimleri

`user.service.ts` ve `user.controller.ts` şunları içermeli:
- **Kendi Profilini Getirme (`GET /users/me`):**
  - JWT korumalı olmalıdır.
  - İstek atan kullanıcının `id`, `username`, `eloScore`, `wins`, `losses` ve `totalMatches` bilgilerini içeren `UserProfileResponse` tipinde veri döndürür.
- **Liderlik Tablosu (`GET /users/leaderboard`):**
  - Herkese açık (Public) olmalıdır.
  - ELO puanına göre en yüksekten en düşüğe sıralanmış ilk 50 kullanıcıyı `LeaderboardEntry[]` formatında döndürür.
- **Kullanıcı Profili Arama (`GET /users/:username`):**
  - Herkese açık (Public) olmalıdır.
  - `:username` ile eşleşen kullanıcıyı veritabanında arar.
  - Bulunamazsa `404 NOT_FOUND` hatası (`NOT_FOUND` koduyla) fırlatır.
  - Bulunursa, kullanıcının profil bilgilerini ve son maç geçmişlerini `UserPublicProfileResponse` formatında döndürür.
- **Evrensel Kurallar:**
  - Tüm Prisma sorguları try-catch blokları ile sarmalanmalı (Skill: `.antigravity/skills/prisma.md`).
  - `@Public()` decorator'ü uygun şekilde public endpoint'lere uygulanmalı, `/users/me` ise guard tarafından korunmalıdır.

### Bağlam Dosyaları
- `docs/spec.md` → Bölüm 11.3 & 13 (Endpoint yapısı ve hata formatı)
- `shared/types/api-response.types.ts` → `UserProfileResponse`, `LeaderboardEntry`, `UserPublicProfileResponse` tanımları
- `AGENTS.md` → Kesin Kurallar (any tipi yasağı)

### Kabul Kriterleri
- [ ] `/users/me` token olmadan çağrıldığında 401 UNAUTHORIZED dönmeli
- [ ] `/users/leaderboard` en yüksek ELO'ya sahip ilk 50 kullanıcıyı getirmeli
- [ ] Olmayan kullanıcı arandığında 404 NOT_FOUND dönmeli
- [ ] `npm run test -w backend` tüm testlerden geçmeli (UserModule için de unit testler yazılmalı)
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı

### Onay Durumu
- [ ] Ajan testleri / derleme geçti
- [ ] İnsan inceledi ve onayladı
- [ ] feature/user branch'ten develop'a merge edildi
