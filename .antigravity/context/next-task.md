# Sıradaki Görev

---

## Görev: T-21…T-24 — Turnuva Frontend (Öğretmen, Öğrenci, Projeksiyon, Check-in, Hakem, Bot Kilidi & CSV/Yazdır)

### Branch
`feature/tournament-frontend` (base: `develop`)

### Ne Yapılacak?
- `#/tournaments` rotası ve üst barda "🏆 Turnuvalar" butonu (`App.tsx`, `router.ts`).
- `TournamentPage.tsx`:
  - Öğrenci: 6 haneli kodla turnuvaya katılma (opsiyonel sınıf etiketi), Check-in ("✅ Hazırım") butonu, `/tournament` WebSocket üzerinden `tournament:match_assigned` geldiğinde otomatik `#/game` tahtasına yönlendirme.
  - Öğretmen / Admin: Turnuva oluşturma formu (Ad, Okul, Tur sayısı, Tek/Çift set, ELO etkilesin mi, Hamle süresi), büyük punto katılım kodu ekranı, Yoklama (Check-in) açma, Turu Başlatma, Projeksiyon/Canlı Masalar + Puan Tablosu, ortak ağ/IP sarı uyarı rozeti (`⚠️ Ortak Ağ`), hakem hükmen karar (`P1_WIN`, `P2_WIN`, `DRAW`, `NO_SHOW`), diskalifiye, okul filtresi ve CSV indirme / Yazdır butonu.
- `LobbyPage.tsx`: Aktif turnuva maçı varken PvE Bot modunu kilitleme (`GET /tournaments/my-active-status`).
