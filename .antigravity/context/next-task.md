# Sıradaki Görev

---

## Görev: Canlı Ortam Kabul Testleri, Temaların Doğrulanması ve Teslim (Final UAT)

### Ne Yapılacak?
Uygulamanın canlı sunucu ortamında (`mangala-prime.egitimhaber.gen.tr`) uçtan uca kabul testlerini ve tüm temaların (özellikle yeni eklenen "Rustik v0.app" temasının) görsel doğruluğunu test et.
1. Canlı web arayüzüne tarayıcıdan girip kullanıcı kaydı oluşturmayı dene.
2. Lobi gateway ve websocket bağlantılarının stabil olduğunu doğrula.
3. Tema seçiciyi kullanarak tüm temaların (Ahşap, Neon, Rustik, Rustik v0.app) sorunsuz yüklendiğini kontrol et.
4. Hızlı eşleşme ve canlı oynanış mekaniklerinin çalıştığını test et.

### Oluşturulacak/Değiştirilecek Dosyalar
- Yok (Sadece canlı sistem doğrulama ve manuel testler yapılacak).

### Kabul Kriterleri
- [ ] Yeni kullanıcı kayıt adımı sorunsuz çalışıyor, DB'ye kullanıcı kaydı ekleniyor.
- [ ] Lobiye sorunsuz bağlanılıyor, WebSocket bağlantısı kuruluyor.
- [ ] Tüm 4 tema (Ahşap, Neon, Rustik, Rustik v0.app) arayüzde seçilebiliyor ve görsel stil değişiklikleri hatasız uygulanıyor.
- [ ] Maç eşleşmesi ve karşılıklı hamle iletimi canlı ortamda çalışıyor.
