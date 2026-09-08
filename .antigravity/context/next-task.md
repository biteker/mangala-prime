# Sıradaki Görev

---

## Görev: Yayın Öncesi Güvenlik & Kararlılık Sertleştirmesi veya Local PvP Modu

### Ne Yapılacak?
`docs/production-backlog.md` dokümanında listelenen eksiklerden kullanıcı tercihi doğrultusunda ilk paketi uygulamak:
1. **Paket A (Güvenlik & Kararlılık):** CORS whitelist, Helmet, Rate Limiting (`@nestjs/throttler`), `.env.example` JWT ayarları ve `--accept-data-loss` temizliği.
2. **Paket B (Oynanış & İçerik):** Spec Bölüm 4.6 uyarınca aynı cihazda iki kişinin oynayabilmesi için "Local PvP" modunun eklenmesi ve Liderlik Tablosu (Leaderboard) arayüzünün oluşturulması.

### Referans Doküman
- `docs/production-backlog.md`

### Kabul Kriterleri
- [ ] Seçilen paketin geliştirmeleri tamamlandı.
- [ ] Tüm unit testler (`npm run test`) %100 geçti.
- [ ] Monorepo hatasız derlendi (`npm run build`).
- [ ] Canlı ortamda doğrulandı.
