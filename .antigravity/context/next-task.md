# Sıradaki Görev

---

## Görev: Auth (Kimlik Doğrulama) Modülü (Aşama 5/14)

### Ne Yapılacak?
Kullanıcı kayıt, giriş, refresh token rotasyonu ve çıkış işlemlerini yöneten JWT tabanlı `AuthModule` bileşenlerini NestJS backend bünyesinde geliştir.

### Oluşturulacak Dosyalar

**Backend:**
```
/backend/src/auth/auth.module.ts
/backend/src/auth/auth.controller.ts
/backend/src/auth/auth.service.ts
/backend/src/auth/auth.guard.ts
/backend/src/auth/dto/register.dto.ts
/backend/src/auth/dto/login.dto.ts
/backend/src/auth/strategies/jwt.strategy.ts
```

### İçerik Gereksinimleri

`auth.service.ts` ve `auth.controller.ts` şunları içermeli:
- **Kullanıcı Kayıt (`/auth/register`):**
  - `{ username, password }` alır. Şifreyi `bcrypt` (cost factor 12) ile hash'ler.
  - Aynı username ile kayıt denendiğinde `409 Conflict` fırlatır.
  - Başarılı kayıtta `{ data: { userId, username } }` döner.
- **Kullanıcı Giriş (`/auth/login`):**
  - `{ username, password }` alır. Şifreyi doğrular.
  - Hatalı şifre/kullanıcı durumunda `401 Unauthorized` fırlatır.
  - Başarılı girişte `accessToken` (1 saat ömürlü) JSON response gövdesinde dönmeli, `refreshToken` (30 gün ömürlü) ise `HttpOnly`, `Secure`, `SameSite=Strict` cookie olarak set edilmelidir.
- **Token Yenileme (`/auth/refresh`):**
  - Cookie'deki `refreshToken`'ı okur, doğrular ve yeni bir çift (`accessToken` + rotated `refreshToken`) üretir.
  - Eski `refreshToken` geçersiz kılınmalıdır (rotasyon kuralı).
- **Çıkış İşlemi (`/auth/logout`):**
  - `refreshToken` cookie'sini temizler.
- **DTO Doğrulamaları:**
  - `register.dto.ts` ve `login.dto.ts` `class-validator` dekoratörleri ile doğrulanmalı. Şifre en az 8 karakter olmalıdır.
- **Hata Formatı:**
  - Hata durumunda dönen response `{ error: { code, message } }` formatında olmalıdır.

### Bağlam Dosyaları
- `docs/spec.md` → Bölüm 11 (Kimlik Doğrulama ve Oturum Güvenliği)
- `docs/spec.md` → Bölüm 13 (Hata Yönetimi ve Response Standartları)
- `AGENTS.md` → Kesin Kurallar (class-validator kullanımı, any tipi yasağı)

### Kabul Kriterleri
- [ ] Aynı kullanıcı adıyla ikinci kayıt denendiğinde 409 CONFLICT dönmeli
- [ ] Yanlış şifre girildiğinde 401 UNAUTHORIZED dönmeli
- [ ] Başarılı girişte accessToken body'de, refresh token HTTP-only cookie'de olmalı
- [ ] Tüm DTO'lar class-validator ile doğrulanmalı
- [ ] `npm run test -w backend` tüm testlerden geçmeli
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı

### Onay Durumu
- [ ] Ajan testleri / derleme geçti
- [ ] İnsan inceledi ve onayladı
- [ ] feature/auth branch'ten develop'a merge edildi
