# İnsan İnceleme ve Onay Listesi

Bu liste senin kalite kapındır. Bir modül bu listeden geçmeden
merge edilmez ve bir sonraki modüle geçilmez.

---

## BACKEND MODÜLÜ İNCELEME

### Otomatik Kontroller (Ajan Yapar)
- [ ] `npm run build` hatasız tamamlandı
- [ ] `npm run test` — tüm testler geçti
- [ ] `npm run test:cov` — kapsam hedefi karşılandı
- [ ] `any` tipi kullanımı: 0 adet

### Manuel Kontroller (Sen Yaparsın)

**Tip Tanımları Modülü:**
- [ ] Interface'ler mantıklı ve eksiksiz görünüyor
- [ ] Hiçbir tip `any` veya `object` kullanmıyor

**Auth Modülü:**
- [ ] Postman: `POST /auth/register` — yeni kullanıcı oluştu
- [ ] Postman: `POST /auth/register` — aynı kullanıcı adıyla 409 döndü
- [ ] Postman: `POST /auth/login` — response body'de `accessToken` var
- [ ] Postman: `POST /auth/login` — browser'da httpOnly cookie oluştu
- [ ] Postman: Korumalı endpoint'e token olmadan istek → 401
- [ ] Postman: Süresi dolmuş token ile istek → 401

**Oyun Motoru Modülü:**
- [ ] 8 zorunlu test senaryosunun hepsi geçti
- [ ] Manuel: Tek taşlı hamle doğru çalışıyor
- [ ] Manuel: Hazine kuralı (ek hamle) doğru çalışıyor
- [ ] Manuel: Turan taktiği doğru çalışıyor

**Game Gateway Modülü:**
- [ ] İki farklı sekmede aç, bağlantı kuruldu
- [ ] Bir hamle yap, karşı ekranda tahta güncellendi
- [ ] Sırası olmayan oyuncu hamle atmaya çalıştı → hata aldı
- [ ] Bir sekmeyi kapat → 60 saniyelik pencere başladı
- [ ] 60 saniye içinde yeniden bağlan → oyun devam etti

**User / Leaderboard Modülü:**
- [ ] Postman: `GET /users/leaderboard` — ELO'ya göre sıralı liste döndü

---

## FRONTEND MODÜLÜ İNCELEME

### Otomatik Kontroller (Ajan Yapar)
- [ ] `npm run build` hatasız tamamlandı
- [ ] TypeScript hatasız

### Manuel Kontroller (Sen Yaparsın)

**Store'lar + API Katmanı:**
- [ ] Auth store: giriş sonrası accessToken memory'de tutuluyor
- [ ] Sayfa yenilenince token kayboldu (beklenen davranış)
- [ ] Refresh token ile sessiz yenileme çalışıyor

**Auth Sayfaları:**
- [ ] Kayıt formu: hatalı girişte hata mesajı görünüyor
- [ ] Giriş sonrası lobi sayfasına yönlendiriyor
- [ ] Mobilde (DevTools) form düzgün görünüyor

**Lobi Sayfası:**
- [ ] Online kullanıcı listesi görünüyor
- [ ] "Hızlı Maç Bul" butonu → sağ üstte "Rakip Aranıyor..." çıktı
- [ ] İptal butonu çalışıyor
- [ ] Mobilde düzgün görünüyor

**Oyun Tahtası (Statik):**
- [ ] 14 kuyu/hazine doğru pozisyonda render edildi
- [ ] Taş sayıları kuyularda görünüyor
- [ ] Ahşap doku görünümü referansa uygun
- [ ] Mobilde tahta tam görünür, kaymıyor
- [ ] Oynanabilir kuyular vurgulanıyor

**Animasyon Katmanı:**
- [ ] Taşlar sırayla düşüyor (hepsi aynı anda değil)
- [ ] Animasyon sırasında tıklama engelleniyor
- [ ] Animasyon sonrası tahta doğru durumda
- [ ] Gözle izlendiğinde akıcı hissettiriyor

---

## CI/CD İNCELEME

- [ ] GitHub Actions pipeline yeşil
- [ ] Hetzner sunucusuna deploy başarılı
- [ ] Prisma migration hatasız uygulandı
- [ ] PM2 servisi çalışıyor

---

## ONAY VE MERGE

```
Modül Adı: _______________
İnceleme Tarihi: _______________

Yukarıdaki tüm ilgili kutular işaretlendi mi? [ ]

İncelemeyi Yapan: _______________
Merge Kararı: [ ] Onaylandı  [ ] Düzeltme Gerekiyor

Düzeltme Notu (varsa):
_______________
```

---

## Düzeltme Döngüsü

Bir modül onaylanmazsa:

1. Bu dosyaya düzeltme notunu yaz
2. `next-task.md`'yi güncelle: sorunu ve beklenen çözümü yaz
3. Yeni ajan oturumu başlat
4. Ajan düzeltir, tekrar PR açar
5. Bu listeyi tekrar gözden geçir
