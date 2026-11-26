# Sıradaki Görev: Faz F Branch'lerinin Push, PR ve `develop` / `main` Merge Süreci

## Durum
Faz F (`T-25`, `T-26`, `T-27`, `T-28`) tamamlandı ve tüm doğrulamalar (`npm run build -w shared`, `npm run lint`, `npm run test` — 163/163 test, `npm run build`) geçti.

## Yerel Stacked Branch'ler
1. `feature/fix-endgame-sweep-and-board` (T-25)
2. `feature/fix-game-connect-and-turn-ui` (T-26)
3. `feature/tournament-flow-and-theme-lock` (T-27, T-28)

## Kullanıcı Aksiyonu Gerekli
GitHub CLI keyring token'ı geçersiz durumda. Terminalde aşağıdaki adımı çalıştırdıktan sonra branch'ler push edilip PR açılabilir:
```bash
gh auth login -h github.com
```
Ardından sırasıyla PR açılıp `develop` ve `main` dallarına birleştirilebilir.
