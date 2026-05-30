# Sıradaki Görev

---

## Görev: Frontend Animasyon Katmanı (Aşama 13/14)

### Ne Yapılacak?
Mangala oyununun canlı oynanışı sırasında taşların sırayla kuyulara dağıtılmasını sağlayan ardışık animasyon yapısını geliştir. Hamle yapıldığında, tahta anında güncellenmek yerine, taşlar kuyu geçişlerinde 150-200ms gecikmeyle sırayla düşmeli, geçilen kuyu hafifçe büyümeli/titremeli ve kuyu taş sayaçları animasyonla senkronize olarak güncellenmelidir. Animasyon süresince tahta tıklamalara tamamen kapatılmalıdır (input-lock).

### Oluşturulacak/Değiştirilecek Dosyalar

**Frontend:**
- `frontend/src/components/GamePage.tsx` [MODIFY] — Hamle yapıldığında ve socket'ten yeni tahta durumu geldiğinde animasyon sırasını yönetecek yerel durum yönetimi veya ref animasyon kuyruğu entegrasyonu, hamle sırasında tıklamaların engellenmesi.
- `frontend/src/index.css` [MODIFY] — Taş düşme anında kuyuların büyümesi/titremesi (`shake`/`scale`) için CSS keyframe tanımları ve animasyon sınıfları.

### İçerik Gereksinimleri
- **Ardışık Taş Dağıtımı:**
  - Hamle yapıldığında tahta durumu doğrudan son haline güncellenmek yerine, başlangıç kuyusundan başlanarak saat yönünün tersine sırayla her kuyuya 150-200ms aralıklarla taş düşer.
  - Geçilen her bir kuyunun taş sayısı animasyon anında +1 artar (veya son durumuna ulaşana kadar senkronize artış gösterir).
- **Animasyon Kilidi (Input Lock):**
  - Animasyon başlar başlamaz tahta üzerindeki tüm tıklama etkileşimleri (`makeMove` tetikleyicisi) engellenmeli ve animasyon bittiğinde tekrar açılmalıdır.
- **Mikro Animasyonlar:**
  - Taşın düştüğü kuyu hafifçe ölçeklenmeli (grow) veya titremelidir (shake).
  - Görsel taş dağılımı (taş noktaları `stone-dot`’ları) animasyonlu artışla uyumlu olarak kuyuda belirmelidir.
- **Socket/State Senkronizasyonu:**
  - Sunucudan hamle sonucu (`game:move_made`) veya yeniden bağlantı gibi bir olay geldiğinde, animasyonun düzgün oynatılması ve ardından en güncel global durumla tahtanın eşitlenmesi sağlanmalıdır.

### Kabul Kriterleri
- [ ] Hamle yapıldığında taşlar sırasıyla kuyulara 150-200ms gecikme ile düşüyor (anlık geçiş yok).
- [ ] Animasyon süresince oyun alanı ve kuyular etkileşime kapatılıyor (tıklanamaz hale geliyor).
- [ ] Taşın düştüğü kuyu hafifçe büyüyor/titriyor ve sayaçları senkron güncelleniyor.
- [ ] `npm run build` monorepo genelinde başarıyla tamamlanmalı.
