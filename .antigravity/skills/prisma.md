# SKILL: Prisma Veritabanı Yazma Standardı

Bu skill'i Prisma şeması, migration ve veritabanı işlemleri yazarken oku.

---

## Migration Stratejisi

**MVP (SQLite):** `prisma db push` kullan — hızlı prototipleme için.
**Faz 2 (PostgreSQL):** `prisma migrate dev` kullan — versiyon kontrollü migration.

```bash
# Şemayı veritabanına uygula (MVP)
npx prisma db push

# Migration oluştur (Faz 2)
npx prisma migrate dev --name açıklayıcı_isim

# Client'ı yeniden üret
npx prisma generate
```

---

## Sorgu Sarmalama Kuralı (İstisna Yok)

Tüm Prisma sorguları try-catch ile sarılmalıdır:

```typescript
async findByUsername(username: string): Promise<User> {
  try {
    const user = await this.prisma.user.findUnique({
      where: { username },
    })
    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Kullanıcı bulunamadı.',
      })
    }
    return user
  } catch (error) {
    if (error instanceof NotFoundException) throw error
    throw new InternalServerErrorException({
      code: 'INTERNAL_ERROR',
      message: 'Veritabanı hatası.',
    })
  }
}
```

---

## Transaction Kullanımı

Birden fazla tabloya yazan işlemler tek transaction'da sarılmalı:

```typescript
async finishMatch(matchId: string, winnerId: string, eloChanges: EloChange): Promise<void> {
  try {
    await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          winnerId,
          p1EloChange: eloChanges.p1,
          p2EloChange: eloChanges.p2,
        },
      }),
      this.prisma.user.update({
        where: { id: eloChanges.winnerId },
        data: {
          eloScore: { increment: eloChanges.winnerDelta },
          wins: { increment: 1 },
        },
      }),
      this.prisma.user.update({
        where: { id: eloChanges.loserId },
        data: {
          eloScore: { increment: eloChanges.loserDelta },
          losses: { increment: 1 },
        },
      }),
    ])
  } catch (error) {
    throw new InternalServerErrorException({
      code: 'INTERNAL_ERROR',
      message: 'Maç sonuçlandırma hatası.',
    })
  }
}
```

---

## Seed Data (Geliştirme Ortamı)

`prisma/seed.ts` dosyası oluşturulmalı:

```typescript
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const hash = await bcrypt.hash('test1234', 12)

  await prisma.user.createMany({
    data: [
      { username: 'player1', passwordHash: hash, eloScore: 1000 },
      { username: 'player2', passwordHash: hash, eloScore: 1200 },
      { username: 'player3', passwordHash: hash, eloScore: 800 },
    ],
  })

  console.log('Seed tamamlandı.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Çalıştırma: `npx prisma db seed`

`package.json`'a ekle:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Prisma Yapılandırma ve Servis Entegrasyonu (Prisma 7+)

### 1. `prisma.config.ts` Yapısı
Prisma 7.x ve sonrasında `prisma.config.ts` dosyası sadece temel yolları ve veri kaynaklarını yönetir. Kesinlikle `earlyAccess` ve `client.adapter` alanlarını içermemelidir:

```typescript
import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

const dbAbsPath = path.resolve(__dirname, 'prisma', 'dev.db');
const dbUrl = `file:${dbAbsPath}`;

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: dbUrl,
  },
});
```

### 2. `PrismaService` (NestJS Entegrasyonu)
Adaptörler (örneğin SQLite için LibSQL adaptörü) doğrudan servis başlatılırken `super` çağrısına iletilmelidir:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as path from 'path';

function createAdapter(): PrismaLibSql {
  const dbAbsPath = path.resolve(process.cwd(), '..', 'prisma', 'dev.db');
  const dbUrl = process.env['DATABASE_URL'] ?? `file:${dbAbsPath}`;
  return new PrismaLibSql({ url: dbUrl });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Bu servis `AppModule` providers'ına eklenir, diğer modüller inject eder.

---

## Yasaklar

- Raw SQL sorgusu yasak (Prisma query API kullan)
- `any` tipi ile Prisma sonucu cast etme yasak
- `try-catch` olmadan Prisma çağrısı yasak
- Migration dosyalarını elle düzenleme yasak
- `prisma.config.ts` içinde `earlyAccess: true` veya `client: { adapter: ... }` kullanımı yasak (Prisma 7 standartlarına aykırıdır)

---

## Referans

→ Şema tasarımı için bkz. `docs/spec.md` Bölüm 5
→ Hata formatı için bkz. `docs/spec.md` Bölüm 13

