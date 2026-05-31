# Sıradaki Görev

---

## Görev: GitHub Actions CI/CD Altyapısı ve Deploy Yapılandırması (Aşama 14/14)

### Ne Yapılacak?
Projenin GitHub Actions pipeline entegrasyonunu ve Hetzner bulut sunucusuna deploy yapılandırmasını gerçekleştir. Pipeline; Node.js ortamını kurmalı, bağımlılıkları yüklemeli, monorepo TSC ve Vite derlemesini doğrulamalı, unit testleri (`npm run test`) koşturmalı ve başarılı olan testlerin ardından SSH + rsync aracılığıyla Hetzner sunucusuna dağıtımı (deploy) sağlamalı, Prisma veritabanı şema güncellemelerini (`npx prisma db push`) yapmalı ve PM2 servisini sıfır kesintiyle (zero-downtime) yeniden başlatmalıdır.

### Oluşturulacak/Değiştirilecek Dosyalar

- `.github/workflows/ci-cd.yml` [NEW] — GitHub Actions workflow yaml dosyası (Build, Test ve Deploy adımları).
- `backend/ecosystem.config.js` veya `ecosystem.config.js` [NEW] — Zero-downtime PM2 başlatma/restart ayarlarını barındıran konfigürasyon dosyası.

### Kabul Kriterleri
- [ ] GitHub workflow; PR açıldığında veya develop'a push yapıldığında tetiklenerek monorepo genelinde `npm ci`, `npm run build` ve `npm run test` adımlarını hatasız tamamlıyor.
- [ ] Dağıtım adımı (deploy); başarılı testlerin ardından SSH anahtarları ve sırları (secrets) kullanarak Hetzner sunucusuna kodları aktarıyor ve Prisma migration'larını koşturuyor.
- [ ] PM2 zero-downtime restart adımları başarıyla yapılandırıldı.
