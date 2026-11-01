# Mangala Prime — Öğrenilen Dersler ve Hata Analizi (Post-Mortem)

Bu doküman, Mangala Prime projesinin geliştirilmesi sırasında karşılaşılan kritik hataları, bunların kök nedenlerini, uygulanan çözümleri ve gelecekteki projelerde aynı hatalarla karşılaşmamak için alınması gereken önlemleri içermektedir.

---

## 1. Prisma 7 Yapılandırması ve Docker Dağıtım Hataları

### **Sorun Nedir?**
- NestJS backend uygulaması Docker konteyneri içinde başlatılırken veya `npx prisma db push` komutu çalıştırılırken `prisma.config.ts` dosyasının bulunamaması ve `DATABASE_URL` okuma hataları yaşandı.
- Prisma 7.x ile birlikte gelen kırıcı değişiklikler (breaking changes) nedeniyle `earlyAccess` ve `client.adapter` tiplerinde uyumsuzluklar oluştu.

### **Kök Nedenler**
1. **Docker Yapılandırma Eksikliği:** Çok aşamalı (multi-stage) Docker yapısında, derleme (`build-backend`) ve çalışma (`runner`) aşamalarında root dizindeki `prisma.config.ts` dosyasının kopyalanması unutulmuştu. Prisma 7 bu dosyayı çalışma dizininde bulamadığı için çalışmayı durdurdu.
2. **Kütüphane Sürüm Güncellemeleri:** Prisma 7 ile birlikte `schema.prisma` dosyasından `datasource.url` kaldırılmış ve bunun yerine `prisma.config.ts` zorunlu kılınmıştır. Ayrıca LibSQL gibi adaptörlerin doğrudan `PrismaService` instantiation aşamasında constructor içinde tanımlanması gerekmektedir; statik config içinde tanımlanması tip hatalarına yol açar.

### **Gelecek Projeler İçin Önlemler**
- **Çok Aşamalı Dockerfile Kontrolü:** Projede kullanılan ve çalışma zamanında dinamik okunan tüm yapılandırma dosyalarının (özellikle Prisma 7 config vb.) Dockerfile'daki **tüm** ilgili aşamalara (`COPY`) eklendiğinden emin olunmalıdır.
- **Sürüm Kılavuzlarına Bağlılık:** Büyük ORM ve kütüphane güncellemelerinde (örneğin Prisma 6 -> 7 geçişi), konfigurasyon yapıları ve adaptör tanımlamaları için hazırlanan güncel yetenek kılavuzları (`skills/prisma.md` vb.) oluşturulmalı ve buna sıkı sıkıya bağlı kalınmalıdır.

---

## 2. React StrictMode ve WebSocket Bağlantı Sorunları

### **Sorun Nedir?**
- Oyuncular oyun sayfasına girdiğinde (`GamePage.tsx`), websocket bağlantısı kurulduktan hemen sonra kopuyor veya oyuncu rengi (`yourColor`), sıradaki oyuncu (`currentPlayerId`) gibi kritik state'ler `null` değerine düşüyordu. Bu durum kuyulara tıklanmasını ve hamle iletimini engelliyordu.

### **Kök Nedenler**
1. **React StrictMode Çift Tetikleme:** Geliştirme ortamında React `StrictMode`, bileşenlerin `useEffect` kancalarını (hook) olası bellek sızıntılarını tespit etmek için çift kez çalıştırır. `useEffect` temizleme (cleanup) fonksiyonunda doğrudan `disconnectGame()` çağrısı yapıldığı için, ilk mount işleminden hemen sonra soket bağlantısı kesiliyor, ardından gelen ikinci mount ise soketi yeniden açmaya çalışırken durum yönetimini (state) tutarsız hale getiriyordu.
2. **Eksik Bağlantı Guard Mekanizmaları:** Zustand store üzerindeki `.connected` bayrağı (flag) soket durumunu tam yansıtmıyor ve StrictMode çift tetiklemesinde kilitlenmelere yol açıyordu.

### **Gelecek Projeler İçin Önlemler**
- **Idempotent WebSocket Yönetimi:** `useEffect` kancalarında soket bağlantısı yönetilirken, StrictMode uyumluluğu gözetilmelidir. Bağlantı kesme (disconnect) işlemi sadece sayfa gerçekten terk edildiğinde (unmount) tetiklenmeli veya bağlantı açma fonksiyonu halihazırda aktif bir bağlantı olup olmadığını kontrol eden koruyucu koşullarla (`if (socket.connected) return;`) sarmalanmalıdır.
- **Store Yaşam Döngüsü Ayırımı:** Küresel durum yöneticileri (Zustand/Redux) içindeki soket bağlantı durumları, arayüz bileşenlerinin anlık render döngülerinden izole edilmelidir.

---

## 3. Reconnection ve State Senkronizasyon Eksiklikleri

### **Sorun Nedir?**
- Kullanıcı anlık olarak internet koptuğunda veya tarayıcıyı yenilediğinde oyuna geri bağlanabiliyordu (`game:reconnect`), ancak oyun tahtasındaki kendi taş rengini (`yourColor`) kaybediyor ve hamle yapamaz hale geliyordu.

### **Kök Nedenler**
1. **Eksik Payload Tasarımı:** Sunucudan istemciye gönderilen reconnection onay paketi (`game:reconnect_ack`), sadece genel oyun odası durumunu (board state, active player vs.) içeriyordu. Ancak yeniden bağlanan spesifik istemcinin hangi oyuncu rengine (Player 0 mı, Player 1 mi) sahip olduğu bilgisi bu pakette yer almıyordu.
2. **Client-Side Hafıza Kaybı:** Yenileme sonrası istemcinin belleği sıfırlandığı için sunucu kimlik doğrulaması yapsa dahi istemci tarafında rol eşleşmesi tamamlanamıyordu.

### **Gelecek Projeler İçin Önlemler**
- **Bütünsel Senkronizasyon (Re-sync-all):** Reconnection veya state geri yükleme protokollerinde, istemciye sadece genel oyun durumu değil, o istemciye özel kişiselleştirilmiş rol/veri seti de (`yourColor`, `opponentUsername` vb.) tek bir atomik pakette gönderilmelidir.
- **Soket Sözleşmelerinde Ortak Tipler:** Socket payload tipleri (`shared/types/socket-events.types.ts`) tasarlanırken reconnection senaryoları uçtan uca simüle edilerek gerekli tüm alanlar başlangıçta sözleşmeye dahil edilmelidir.

---

## 4. WebSocket Test ve Mock Yapılandırması Zorlukları

### **Sorun Nedir?**
- Backend birim testlerinde (`lobby.gateway.spec.ts`, `game.gateway.spec.ts`) mock soketlerin broadcast yapması gereken yerlerde testler çöküyor veya asenkron olaylar yakalanamıyordu.

### **Kök Nedenler**
- **Mock Soket Yetersizliği:** `socket.io` kütüphanesinin NestJS WebSocket gateway yapısı içindeki `socket.to(room).emit()` veya `server.emit()` gibi zincirleme (chaining) metod çağrıları birim test mock nesnelerinde tam olarak simüle edilmemişti.

### **Gelecek Projeler İçin Önlemler**
- **Standart Mock Kütüphaneleri / Şablonları:** WebSocket içeren tüm projelerin başlangıcında, `testing.md` yetenek dosyasına zincirleme çağrıları (`to().emit()`, `broadcast.emit()`) hatasız simüle edebilen standart bir mock soket nesnesi şablonu eklenmeli ve tüm gateway testlerinde bu ortak mock altyapısı kullanılmalıdır.

---

## Gelecek Projeler İçin Hazır Kontrol Listesi (Checklist)

- [ ] **Docker:** Yeni eklenen her config dosyası Dockerfile'daki derleme ve çalışma aşamalarına dahil edildi mi?
- [ ] **React:** `useEffect` cleanup fonksiyonları React StrictMode altında test edildi mi? Çift render durumunda harici bağlantılar (soket, timer, API polling) sızıntıya veya erken kesilmeye yol açıyor mu?
- [ ] **WebSocket:** Sayfa yenilendiğinde (Refresh/Reconnect) istemci sıfırdan tüm state'i ve kendi rolünü (`yourColor` vb.) sunucudan tek seferde çekebiliyor mu?
- [ ] **Prisma:** Büyük sürüm geçişlerinde driver adaptörleri ve şema değişiklikleri kontrol edilip `PrismaService` kurallara uygun yapılandırıldı mı?
- [ ] **Birim Testleri:** WebSocket Gateway testlerinde kullanılan mock nesneleri `to().emit()` gibi zincirleme çağrıları destekliyor mu?
