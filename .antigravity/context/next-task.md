# Sıradaki Görev

---

## Görev: T-20 — Turnuva Backend Modülü (REST + WS `/tournament`) + T-22 Check-in & Hakem

### Branch
`feature/tournament-backend` (base: `develop`)

### Ne Yapılacak?
- `TournamentModule` (`backend/src/tournament/`):
  - Turnuva oluşturma (`POST /tournaments`, `@Roles('TEACHER', 'ADMIN')`, benzersiz `joinCode`, `setsPerMatch: 1|2`, `affectsGlobalElo`).
  - Öğrenci katılımı (`POST /tournaments/join`), Check-in yoklama (`POST /tournaments/:id/check-in`), Tur başlatma (`POST /tournaments/:id/start-round`), Hakem hükmen karar (`PATCH /tournaments/:id/pairings/:pairingId/result`), Diskalifiye (`PATCH /tournaments/:id/participants/:userId/disqualify`), CSV dışa aktarma (`GET /tournaments/:id/export`).
  - `TournamentGateway` (`/tournament` namespace): Canlı turnuva odası, `tournament:updated` ve `tournament:match_assigned` event'leri.
  - `GameService` entegrasyonu: Turnuva maçı bittiğinde 2 setlik maçta otomatik P1↔P2 taraf değişimli 2. seti açma, puan/Buchholz güncelleme ve aktif turnuva maçında bot kilidi bilgisi.
