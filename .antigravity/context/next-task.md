# Sıradaki Görev

---

## Görev: Prisma Şeması ve Veritabanı Kurulumu (Aşama 2/14)

### Ne Yapılacak?
Projenin veritabanı katmanını yapılandır. SQLite tabanlı Prisma şemasını oluştur, modelleri tanımla, seed dosyası hazırla ve local veritabanını ayağa kaldır.

### Oluşturulacak Dosyalar

**Backend:**
```
/prisma/schema.prisma
/prisma/seed.ts
/backend/src/common/prisma/prisma.service.ts
/backend/src/common/prisma/prisma.module.ts
```

### İçerik Gereksinimleri

`schema.prisma` şunları içermeli:
- `provider = "sqlite"` ve `url = env("DATABASE_URL")`
- `User` modeli: id (UUID), username (unique), passwordHash, eloScore (default 1000), wins (default 0), losses (default 0), deviceFingerprint, createdAt, updatedAt.
- `Match` modeli: id (UUID), player1Id, player2Id, winnerId, status (MatchStatus enum, default ACTIVE), isFriendly (Boolean, default false), p1EloChange, p2EloChange, createdAt, updatedAt.
- `MoveHistory` modeli: id (UUID), matchId, playerId, pitIndex, boardState (JSON string formatında number[]), createdAt.
- `MatchStatus` enum: ACTIVE, FINISHED, ABANDONED.

`prisma.service.ts` şunları içermeli:
- NestJS `PrismaClient` sarmalayıcısı.
- NestJS kurallarına uygun connection handling.
- Sorguların try-catch blokları ile sarılmasını sağlayan helper/wrapper pattern (Skill: `.antigravity/skills/prisma.md`).

`seed.ts` şunları içermeli:
- Test amaçlı 5-10 kullanıcı hesabı (şifre hash'leri bcrypt ile üretilmiş).
- Liderlik tablosu testi için farklı ELO seviyelerinde oyuncular.

### Bağlam Dosyaları
- `docs/spec.md` → Bölüm 5 (Veritabanı stratejisi ve şeması)
- `.antigravity/skills/prisma.md` → Prisma sorguları ve servis mimarisi kuralları

### Kabul Kriterleri
- [ ] `prisma schema` geçerlidir (`npx prisma validate`)
- [ ] `npx prisma db push` başarıyla tamamlanır
- [ ] `npx prisma db seed` başarıyla çalışır ve test verileri veritabanına yazılır
- [ ] NestJS Prisma Module ve Service entegrasyonu tamamlanmıştır
- [ ] `npm run build` backend için başarıyla tamamlanır

### Onay Durumu
- [ ] Ajan testleri / derleme geçti
- [ ] İnsan inceledi ve onayladı
- [ ] feature/prisma branch'ten develop'a merge edildi

### Tamamlanınca
`current-state.md`'de Prisma Şeması satırını ✅ olarak işaretle.
Bu dosyayı (next-task.md) Aşama 3 (ELO Servisi) ile güncelle.
