# Sıradaki Görev

---

## Görev: T-10 — Release Süreci ve Git Hijyeni

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 6, **T-10**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] Faz A görevlerinin tamamı (T-01…T-07) `develop`'a merge edildi mi?

### Ne Yapılacak? (Özet)
1. `develop` → `main` PR'ını aç: PR açıklamasına Faz 1 MVP + Faz A (T-01…T-07) güvenlik ve mimari sertleştirme özetini ekle.
2. İnsan onayı sonrası `main`'e merge et ve `v1.0.0` tag'i oluştur (`git tag -a v1.0.0`).
3. Merge edilmiş eski `feature/*` branch'lerini listele ve insan onayıyla hem yerelde hem remote'ta temizle.
4. Canlı UAT kontrol listesini (`GET /health`, kayıt/giriş/sessiz refresh, 429 rate limit, online maç, reconnect, yerel PvP, CSP/CORS kontrolü) doğrula.

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 6, T-10 · `REVIEW_CHECKLIST.md`

### Kabul Kriterleri
- [ ] `develop` → `main` PR'ı merge edildi ve `v1.0.0` etiketi oluşturuldu
- [ ] Merge edilmiş eski `feature/*` branch'leri temizlendi
- [ ] Canlı UAT maddeleri doğrulandı

### Sonraki Görev
T-12 — Doküman Senkronizasyonu (`docs/architecture-sync`)
