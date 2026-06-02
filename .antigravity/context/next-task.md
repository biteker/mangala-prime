# Sıradaki Görev

---

## Görev: Canlı Ortam Kabul Testleri ve Projenin Teslim Edilmesi (Final UAT)

### Ne Yapılacak?
Tüm deploy işlemlerinin tamamlanması ve veritabanı şema senkronizasyonunun ardından uygulamanın canlı sunucu ortamında (`mangala-prime.egitimhaber.gen.tr`) uçtan uca kabul testlerini gerçekleştir.
1. Canlı web arayüzüne tarayıcıdan girip kullanıcı kaydı oluşturmayı dene (Sorunsuz çalışması gerekmektedir).
2. Lobi gateway ve websocket bağlantılarının stabil olduğunu doğrula.
3. Hızlı eşleşme ve canlı oynanış mekaniklerinin çalıştığını test et.

### Oluşturulacak/Değiştirilecek Dosyalar
- Yok (Sadece canlı sistem doğrulama ve manuel testler yapılacak).

### Kabul Kriterleri
- [ ] Yeni kullanıcı kayıt adımı `201 Created` veya `200 OK` dönüyor, DB'ye kullanıcı kaydı ekleniyor.
- [ ] Lobiye sorunsuz bağlanılıyor, WebSocket hata fırlatmıyor.
- [ ] Maç eşleşmesi ve karşılıklı hamle iletimi canlı ortamda çalışıyor.
