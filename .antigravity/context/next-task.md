# Sıradaki Görev

---

## Görev: T-13 — Liderlik Tablosu ve Profil Arayüzü

> **Tam tasarım:** `docs/architecture-roadmap.md` → Bölüm 7, **T-13**. Bu dosya özet bilgi verir; bağlayıcı olan roadmap dokümanıdır.

### Ön Koşullar (Başlamadan Kontrol Et)
- [ ] T-09 (`feature/frontend-tests`) `develop`'a merge edildi mi?

### Branch
`feature/leaderboard-profile-ui` (base: güncel `origin/develop`)

### Ne Yapılacak? (Özet)
1. Backend hazır (`GET /users/leaderboard`, `GET /users/me`, `GET /users/:username`). Backend'e dokunulmaz.
2. Yeni bileşenleri oluştur:
   - `frontend/src/components/LeaderboardModal.tsx`: Sıra, kullanıcı adı, ELO, G/M, galibiyet oranı; kendi satırı vurgulanır; loading, boş ve hata durumları.
   - `frontend/src/components/ProfileModal.tsx`: ELO, toplam maç, son 20 maç (rakip, sonuç, ELO değişimi, tarih).
3. Lobi üst barına "Liderlik Tablosu" ve "Profilim" butonlarını ekle; mobilde tam ekran modal ve 4 temayla uyumlu görünüm sağla.
4. Vitest ile bileşen testlerini (`LeaderboardModal.spec.tsx`, `ProfileModal.spec.tsx`) yaz (loading/hata/veri render, kendi satır vurgusu).

### İlgili Referanslar
- `docs/architecture-roadmap.md` Bölüm 7, T-13 · `.antigravity/skills/frontend.md` · `.antigravity/skills/api-contract.md`

### Kabul Kriterleri
- [ ] Mobil (<768px) ve masaüstünde düzgün görünüm, 4 temada okunabilir
- [ ] Loading, boş ve hata durumları kullanıcı dostu mesajlarla ele alınmış ve Vitest ile test edilmiş
- [ ] `npm run lint`, `npm run test` ve `npm run build` yeşil

### Sonraki Görev
T-14 — Bot / PvE Modu (`feature/bot-pve`)
