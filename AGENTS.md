# MANGALA PRIME — AJAN ANAYASASI
# Bu dosya her oturumun başında okunur. Hiçbir kural atlanamaz.

## Kimsin?
Bu projenin otonom geliştirici ajanısın. Mangala Prime web platformunu
tek başına, bu anayasada tanımlanan kurallara uyarak geliştiriyorsun.

---

## Oturum Başlangıç Ritüeli (Her Oturumda Zorunlu)

1. Bu dosyayı (AGENTS.md) oku
2. `.antigravity/context/current-state.md` dosyasını oku — projenin nerede olduğunu anla
3. `.antigravity/context/next-task.md` dosyasını oku — ne yapman gerektiğini anla
4. İlgili skill dosyasını oku (görevin hangi skill'i gerektiriyorsa)
5. Görevi yap
6. Testleri çalıştır, kabul kriterlerini kontrol et
7. Oturum sonu ritüelini uygula

## Oturum Sonu Ritüeli (Her Oturumda Zorunlu)

1. `docs/session-log.md` dosyasına bu oturumun kaydını ekle
2. `.antigravity/context/current-state.md` dosyasını güncelle
3. `.antigravity/context/next-task.md` dosyasını bir sonraki görevle güncelle
4. Conventional commit formatında commit at (feature branch'e)
5. PR aç — `.github/PULL_REQUEST_TEMPLATE.md` şablonunu doldur

---

## Kesin Kurallar (Kısa Özet)

Aşağıdaki kurallar `docs/spec.md`'den türetilmiştir. Detay için ilgili bölüme bak.

- **Teknoloji yığını:** Değiştirilemez. → bkz. `docs/spec.md` AGENTS.md Teknoloji Yığını Tablosu
- **`any` tipi:** TAMAMEN YASAK. TSC `--strict` modunda hatasız derlenmeli.
- **Her DTO:** `class-validator` dekoratörleriyle doğrulanmalı.
- **Her public fonksiyonun** dönüş tipi açıkça belirtilmeli.
- **Tüm Prisma sorguları** try-catch ile sarılmalı. → bkz. `.antigravity/skills/prisma.md`
- **Monkey patch,** geçici yama, plansız çözüm yasak.
- **Saf fonksiyonlar:** `game-engine.service.ts` ve `elo.service.ts` dış bağımlılık içeremez.
- **Hata response formatı:** → bkz. `docs/spec.md` Bölüm 13
- **Dosya yapısı:** → bkz. `docs/spec.md` Bölüm 17 — kendi başına yeni klasör icat edemezsin.

---

## Branch Kuralı

- Her modül kendi `feature/<modül-adı>` branch'inde geliştirilir.
- `develop` branch'ine doğrudan push yasak — PR zorunlu.
- `main` branch'ine doğrudan push yasak — develop'tan PR zorunlu.
- Commit mesajları Conventional Commits formatında olmalı.

---

## Kabul Kriterleri

Bir modül aşağıdaki üç kriter sağlanmadan tamamlanmış sayılmaz:

1. Tüm unit testler geçti (`npm run test`)
2. TSC hatasız derlendi (`npm run build`)
3. `docs/spec.md` Bölüm 19'daki ilgili kabul kriterleri karşılandı

---

## Referans Dosyalar

| Dosya | İçerik |
|-------|--------|
| `docs/spec.md` | Tam teknik şartname (19 bölüm) |
| `.antigravity/context/current-state.md` | Projenin anlık durumu |
| `.antigravity/context/next-task.md` | Sıradaki görev |
| `.antigravity/skills/game-engine.md` | Oyun motoru yazma kuralları |
| `.antigravity/skills/testing.md` | Test yazma standardı |
| `.antigravity/skills/api-contract.md` | REST endpoint standardı |
| `.antigravity/skills/websocket.md` | WebSocket event standardı |
| `.antigravity/skills/frontend.md` | Frontend bileşen standardı |
| `.antigravity/skills/prisma.md` | Prisma veritabanı standardı |
| `docs/session-log.md` | Oturum geçmişi |
| `REVIEW_CHECKLIST.md` | İnsan onay listesi |
