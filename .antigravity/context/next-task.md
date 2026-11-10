# Sıradaki Görev

---

## Görev: T-16 — SEO, Favicon ve PWA

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 7, **T-16**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [x] T-15 (`feature/rematch`) `develop`'a merge edildi mi?

### Branch
`feature/seo-pwa` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. `frontend/index.html`:
   - `<html lang="tr">`
   - `<title>Mangala Prime — Online Türk Zeka Oyunu</title>`
   - Meta description, Open Graph (`og:title`, `og:description`, `og:type`, `og:image`, `og:url`) ve Twitter Card (`summary_large_image`, 1200×630 görsel) etiketleri.
   - `theme-color` ve PWA link etiketleri.
2. Favicon & Sosyal Paylaşım Seti (`frontend/public/`):
   - `favicon.svg`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180), `og-image.png` (1200×630), PWA ikonları (`icon-192.png`, `icon-512.png`).
3. `frontend/public/manifest.webmanifest`:
   - `name`: `"Mangala Prime — Online Türk Zeka Oyunu"`
   - `short_name`: `"Mangala Prime"`
   - `display`: `"standalone"`
   - `orientation`: `"landscape"`
   - `theme_color` ve `background_color`, ikon tanımları.
   - **Not:** Service worker bu fazda eklenmez (WebSocket uygulamasında cache hataları riski). Yalnızca "Ana ekrana ekle" (PWA installable) desteği sağlanır.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 7, T-16 · `.antigravity/skills/frontend.md`

### Kabul Kriterleri
- [ ] `frontend/index.html` Türkçe dil, SEO meta, Open Graph, Twitter Card ve manifest bağlantılarıyla güncellendi
- [ ] Favicon seti ve `manifest.webmanifest` `frontend/public/` altında eksiksiz oluşturuldu
- [ ] `npm run lint`, `npm run test` ve `npm run build` yeşil

### Sonraki Görev
Faz D ve tüm Mimari & Ürün Yol Haritası tamamlandı — Final `develop` → `main` release kontrolü.
