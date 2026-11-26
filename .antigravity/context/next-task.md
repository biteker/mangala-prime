# Sıradaki Görev: T-27 & T-28 — Turnuva Maç Sonu Otomatik 2. Set / Turnuva Salonu Akışı & `theme-pixijs` Sabitlemesi

## Branch
`feature/tournament-flow-and-theme-lock` (taban: `feature/fix-game-connect-and-turn-ui`)

## Kapsam
1. **T-27:** Turnuva maçlarında oyun sonu ekranında "Rövanş Teklif Et" / "Lobiye Dön" kaldırılması; 2 setlik maçta `game:tournament_next_set` ile otomatik 2. sete geçiş (5 sn geri sayım + buton); tur maçı bittiğinde Turnuva Salonuna dönüş (8 sn geri sayım + buton); `TournamentPage` aktif turnuva ID kalıcılığı + bekleme afişi; `LobbyPage` aktif turnuva bağlantısı.
2. **T-28:** `theme.store.ts` ve `App.tsx` üzerinde `theme-pixijs` sabitlemesi ve tema değiştirici butonunun kaldırılması.

## Kabul Kriterleri
- `npm run build -w shared && npm run lint && npm run test && npm run build` hatasız geçer.
- Mevcut tüm backend ve frontend birim testleri ile yeni eklenen tournament metadata testleri geçer.
