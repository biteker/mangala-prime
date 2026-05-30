# Sıradaki Görev

---

## Görev: Frontend Oyun Tahtası ve Canlı Oynanış (Aşama 12/14)

### Ne Yapılacak?
Kullanıcıların canlı olarak Mangala oynayabildiği, tahtadaki 14 kuyu ve hazne yapısını (dizi indeksleriyle eşleşecek şekilde) render eden, hamle yapma (`makeMove`), sıra/zamanlayıcı (15sn turn timer) ve oyun sonu (kazanma/ELO değişimi) durumlarını gösteren **Oyun Tahtası** (`GamePage.tsx`) bileşenini geliştir. Ayrıca oyuncuların birbirleriyle sohbet edebileceği (preset ve serbest metin) canlı chat panelini entegre et.

### Oluşturulacak/Değiştirilecek Dosyalar

**Frontend:**
- `frontend/src/components/GamePage.tsx` [YENİ] — Canlı oynanış, tahta, timer ve chat kontrol ekranı
- `frontend/src/App.tsx` [MODIFY] — `GamePage` bileşeninin `#/game` rotasına bağlanması
- `frontend/src/index.css` [MODIFY] — Mangala oyun tahtası, kuyular, taşlar, timer sayacı ve chat arayüz stilleri

### İçerik Gereksinimleri
- **14 Elemanlı Tahta Tasarımı:**
  - 0-5 kuyuları alt tarafta (Oyuncu 1), 6 nolu hazne sağda.
  - 7-12 kuyuları üst tarafta (Oyuncu 2 - ters yönde sıralı), 13 nolu hazne solda.
  - Kendi kuyularına tıklanarak `makeMove(pitIndex)` tetiklenebilmelidir. Rakip kuyulara veya haznelere tıklama engellenmelidir.
  - Sıra kendisinde değilse veya kuyu boşsa hamle yapılamamalıdır.
- **Sıra ve Zamanlayıcı Gösterimi:**
  - Sıranın kimde olduğu ("Sıra Sizde" / "Sıra Rakipte") belirgin bir görselle gösterilmeli.
  - 15 saniyelik turn timer sayacı geriye doğru saymalı, 5 saniyenin altında sayaç kırmızı renge dönmelidir.
- **Oyun Sonu Ekranı:**
  - Oyun bittiğinde (`gameOverDetails` null olmadığında) kazanan oyuncuyu, kazanma sebebini (normal bitiş, süre aşımı, bağlantı kopması vb.) ve ELO değişimlerini (+/- ELO) gösteren şık bir modal açılmalıdır.
- **Canlı Chat Modülü:**
  - Preset mesajlar ("Güzel hamle!", "Tebrikler!", "Şans benden yana." vb.) ve serbest metin girişi ile rakibe mesaj gönderebilme.
  - Rakip chat'i kapattıysa veya kendimiz kapattıysak bunu belirten durum göstergesi.

### Kabul Kriterleri
- [ ] Oyun tahtası (`GamePage`) 14 kuyu ve hazne yapısıyla modern, premium tasarımla geliştirildi.
- [ ] Kendi kuyularına tıklama ile `makeMove` aksiyonu çalışıyor, rakip kuyular kilitli.
- [ ] Turn timer sayacı (15sn) ve sıra durumları canlı güncelleniyor.
- [ ] Canlı chat paneli (serbest metin ve hazır mesajlar) çalışıyor.
- [ ] Oyun bittiğinde kazananı ve ELO değişimlerini gösteren bitiş modalı açılıyor.
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı.
