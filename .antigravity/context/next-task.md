# Sıradaki Görev

---

## Görev: Frontend Auth Sayfaları (Kayıt, Giriş Ekranları ve JWT Entegrasyonu) (Aşama 10/14)

### Ne Yapılacak?
Kullanıcıların kayıt (`Register`) ve giriş (`Login`) yapabilmesini sağlayan, modern, premium ve responsive auth sayfalarını frontend projesinde geliştir. Bu sayfalar `useAuthStore` ile entegre edilmeli, hata mesajlarını (`error.message`) kullanıcıya göstermeli ve başarılı girişin ardından kullanıcıyı lobi sayfasına yönlendirmelidir.

### Oluşturulacak/Değiştirilecek Dosyalar

**Frontend:**
- `frontend/src/components/LoginForm.tsx` [YENİ] — Giriş formu bileşeni
- `frontend/src/components/RegisterForm.tsx` [YENİ] — Kayıt formu bileşeni
- `frontend/src/components/AuthGuard.tsx` [YENİ] — Oturum durumuna göre rotaları koruyan bileşen
- `frontend/src/App.tsx` [MODIFY] — Giriş, kayıt ve korumalı rota tanımları ile genel yerleşim (layout)

### İçerik Gereksinimleri
- **Premium Tasarım ve Responsive Layout:**
  - Modern, zengin estetiğe sahip, ahşap (`theme-wood`) ve neon (`theme-neon`) temalarla tam uyumlu CSS değişkenleri tabanlı tasarım.
  - Form alanlarında odaklanma (focus), hover ve yükleniyor (loading) durumları için mikro animasyonlar.
- **Hata Yönetimi ve Validasyon:**
  - Form girdileri için temel doğrulamalar (örn. boş olamaz, minimum uzunluk) ve backend'den dönen hataların (`INVALID_PARAMS`, `UNAUTHORIZED`, `CONFLICT` vb.) görsel uyarılarla gösterimi.
- **Auth Guard Rota Koruması:**
  - Giriş yapmamış kullanıcıların `/lobby` veya `/game` gibi korumalı sayfalara erişmesi engellenerek `/login`'e yönlendirilmesi.
  - Giriş yapmış kullanıcıların `/login` veya `/register` sayfalarına gitmesi durumunda otomatik olarak `/lobby`'ye yönlendirilmesi.

### Kabul Kriterleri
- [ ] Giriş formu (`LoginForm`) ve Kayıt formu (`RegisterForm`) modern, premium tasarımla geliştirildi.
- [ ] `useAuthStore` entegrasyonu tamamlandı, token ve kullanıcı verileri başarılı giriş sonrası kaydediliyor.
- [ ] `AuthGuard` rotaları doğru şekilde yönlendiriyor (oturum yoksa /login'e, varsa /lobby'ye).
- [ ] Çoklu tema desteği (klasik ahşap ve neon) formlarda görsel olarak kusursuz çalışıyor.
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı.
