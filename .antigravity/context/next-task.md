# Sıradaki Görev

---

## Görev: Frontend Lobi Sayfası ve Eşleşme Entegrasyonu (Aşama 11/14)

### Ne Yapılacak?
Kullanıcının çevrimiçi oyuncuları görebildiği, onlara oyun daveti gönderebildiği, gelen davetleri yanıtlayabildiği ve FIFO kuyruğuna katılarak otomatik eşleşme sırasına girebildiği modern ve premium **Lobi Sayfası** (`LobbyPage.tsx`) bileşenini geliştir. Bu ekranı `useLobbyStore` ve `useGameStore` entegrasyonuyla canlı soket olaylarına bağla.

### Oluşturulacak/Değiştirilecek Dosyalar

**Frontend:**
- `frontend/src/components/LobbyPage.tsx` [YENİ] — Canlı lobi, oyuncu listesi, davetler ve eşleşme kuyruğu kontrol ekranı
- `frontend/src/App.tsx` [MODIFY] — `LobbyPage` bileşeninin `#/lobby` rotasına bağlanması ve entegrasyonu
- `frontend/src/index.css` [MODIFY] — Lobi kartları, kuyruk animasyonları ve davet modal stilleri

### İçerik Gereksinimleri
- **Matchmaking Arayüzü:**
  - "Hızlı Maç Ara" butonuyla sıraya girme, bekleme süresini gösteren 120 saniyelik sayaç ve sıradan çıkabilme imkanı.
  - Sıra bekleme ekranında premium, göz yormayan animasyonlu bir yüklenme (pulse/rotating) alanı.
- **Çevrimiçi Kullanıcılar Listesi:**
  - O anda lobiye bağlı diğer kullanıcıların listelenmesi (kendi profilimiz hariç).
  - Kullanıcıların durumlarının (lobide, oyunda) ve ELO derecelerinin gösterilmesi.
  - Uygun durumda olan oyuncular için "Oyna" (davet gönder) butonu.
- **Davet Gönderme ve Karşılama Akışı:**
  - Davet gönderildiğinde 30 saniyelik davet zaman aşımı sürecinin takibi.
  - Gelen davetler için kabul/ret seçeneklerini içeren, ekranın ortasında açılan şık bir davet penceresi (modal veya alert banner).
  - Başarılı eşleşme (`game:match_found`) durumunda otomatik olarak `#/game` rotasına yönlendirilmesi.

### Kabul Kriterleri
- [ ] Lobi sayfası (`LobbyPage`) modern, premium tasarımla geliştirildi.
- [ ] Çevrimiçi kullanıcılar listesi canlandırıldı, durumlar ve ELO'lar doğru görünüyor.
- [ ] FIFO matchmaking kuyruğuna giriş/çıkış ve 120 saniyelik sayaç sorunsuz çalışıyor.
- [ ] Oyuncu davet etme ve davet kabul/ret bildirim pencereleri test edildi.
- [ ] Eşleşme sağlandığında `#/game` ekranına otomatik geçiş doğrulandı.
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı.
