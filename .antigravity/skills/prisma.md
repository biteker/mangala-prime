# SKILL: Prisma Veritabanı Yazma Standardı (Prisma 7+)

Bu skill'i Prisma şeması, migration, veritabanı işlemleri ve yapılandırması yazarken oku.

---

## 1. Prisma v5 ve v7 Karşılaştırma Matrisi

| Özellik / Yapı | Prisma v5 (Eski Yaklaşım) | Prisma v7 (Modern Yaklaşım) |
|---|---|---|
| **İstemci Motoru (Engine)** | Rust tabanlı Query Engine ikilisi (binary). Serverless ortamlarında soğuk başlatma gecikmesine yol açar. | **Rust-Free (Wasm)**. TypeScript + WebAssembly çalışma zamanı. %90 daha küçük bundle, 3 kat hızlı sorgular. |
| **Bağlantı Ayarları** | `schema.prisma` içinde doğrudan `url = env("DATABASE_URL")` ile. | **`prisma.config.ts`** dosyası içinde. Schema içinden URL tanımı kaldırılmıştır. |
| **Generator Tanımı** | `provider = "prisma-client-js"` | **`provider = "prisma-client"`** |
| **İstemci Çıktı Dizini** | Varsayılan olarak `node_modules/@prisma/client` içine üretilir. | **`output = "../src/generated/client"` (Zorunlu)**. İstemci artık node_modules dışına özel bir dizine yazılır. |
| **TypeScript Performansı** | Aksırma/yavaşlama yaratan aşırı yüklü tip tanımları (büyük şemalarda IDE yavaşlaması). | ArkType entegrasyonu ile %98 daha az tip değerlendirmesi, %70 daha hızlı tip kontrolü (Type-checking). |
| **Veritabanı Seeding** | `prisma migrate dev` veya reset sonrası otomatik çalışırdı. | Otomatik tetikleme kaldırıldı. Seeding **`npx prisma db seed`** ile manuel çalıştırılmalıdır. |
| **Engine Type** | `engineType = "library" / "binary"` | **Tamamen kaldırıldı**. Bu konfigürasyon artık geçersizdir. |

---

## 2. Migration Stratejisi

**MVP (SQLite):** `prisma db push` kullan — hızlı prototipleme için.  
**Faz 2 (PostgreSQL):** `prisma migrate dev` kullan — versiyon kontrollü migration.

```bash
# Şemayı veritabanına uygula (MVP)
npx prisma db push

# Migration oluştur (Faz 2)
npx prisma migrate dev --name aciklayici_isim

# Client'ı yeniden üret
npx prisma generate
```

---

## 3. Sorgu Sarmalama Kuralı (İstisna Yok)

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

## 4. Transaction Kullanımı

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

## 5. `prisma.config.ts` Yapılandırması

Prisma v7 ile gelen bağlantı dizgileri (Connection Strings) ve migrasyon yolları artık bir TypeScript dosyası olan `prisma.config.ts` ile yönetilmelidir.

- `schema.prisma` dosyasındaki datasource bloğunda `url` tanımı yapılmaz.
- Projenin kök dizininde (root) `prisma.config.ts` dosyası bulunmalıdır.
- Çevre değişkenleri (environment variables), Prisma'nın kendi `prisma/config` paketinden gelen `env()` veya doğrudan süreçten okunabilir.
- `prisma.config.ts` içinde `earlyAccess` veya `client: { adapter: ... }` kullanımı **yasaktır**.

```typescript
import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

const dbAbsPath = path.resolve(__dirname, 'prisma', 'dev.db');
const dbUrl = process.env.DATABASE_URL || `file:${dbAbsPath}`;

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'npx -y tsx prisma/seed.ts',
  },
  datasource: {
    url: dbUrl,
  },
});
```

---

## 6. Yeni `prisma-client` Generator ve Şema Tasarımı

v7'de şema yazarken `prisma-client-js` yerine yeni nesil `prisma-client` kullanılmalıdır. Bu generator kullanılırken `output` parametresinin verilmesi zorunludur, çünkü yeni motor dosyaları doğrudan `node_modules` içine yazmaz.

```prisma
datasource db {
  provider = "sqlite"
}

generator client {
  provider = "prisma-client"
  output   = "../backend/src/generated/client" // Çıktı klasörünü zorunlu olarak belirtiyoruz
}
```

### Kod İçinde Kullanım (İthal Etme)
Yeni generator şemayı belirtilen özel dizine yazdığı için, istemciyi projemize dahil ederken relative yol kullanılmalıdır:

```typescript
// ESKİ YÖNTEM (v5 - GEÇERSİZ/YAVAŞ):
// import { PrismaClient } from '@prisma/client'

// YENİ YÖNTEM (v7 - DOĞRU VE HIZLI):
import { PrismaClient } from '../../generated/client/client.js';

export const prisma = new PrismaClient();
```

---

## 7. `PrismaService` (NestJS Entegrasyonu)

Adaptörler (örneğin SQLite için LibSQL adaptörü) doğrudan servis başlatılırken `super` çağrısına iletilmelidir. İthalat yolu yeni oluşturulan istemci dizinindeki `client.js` dosyasını hedeflemelidir.

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/client/client.js'; // Özel üretilen client konumu
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

---

## 8. Veritabanı Tohumlama (Seeding)

Prisma v7, migrate işlemlerinden sonra otomatik seed özelliğini kaldırmıştır. Seeding işlemleri **manuel** olarak tetiklenmelidir:
```bash
npx prisma db seed
```

### Örnek Seed Dosyası (`prisma/seed.ts`):
```typescript
import { PrismaClient } from '../backend/src/generated/client/client.js'; // Özel üretilen client konumu
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

const dbAbsPath = path.resolve(
  process.cwd(),
  process.cwd().endsWith('backend') ? '../prisma/dev.db' : 'prisma/dev.db'
);

const config = {
  url: process.env.DATABASE_URL || `file:${dbAbsPath}`,
};
const adapter = new PrismaLibSql(config);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const hash = await bcrypt.hash('test1234', 12);

  await prisma.user.createMany({
    data: [
      { username: 'player1', passwordHash: hash, eloScore: 1000 },
      { username: 'player2', passwordHash: hash, eloScore: 1200 },
      { username: 'player3', passwordHash: hash, eloScore: 800 },
    ],
  });

  console.log('Seed tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 9. Sorun Giderme (Troubleshooting)

### SSL / Bağlantı Hataları (P1010)
- **Neden:** v7 ile Rust motorları yerine yerel Node.js `node-pg` sürücüleri kullanılır. Bu, SSL doğrulamasını daha katı hale getirir.
- **Çözüm:** `prisma.config.ts` veya `.env` içerisindeki veritabanı bağlantı dizesinin (PostgreSQL vb.) sonuna `?sslmode=no-verify` veya `?sslaccept=accept_invalid_certs` parametresi ekleyin.

### `Cannot find module './generated/client'` Hatası
- **Neden:** Prisma Client henüz generate edilmemiş veya import yolu şemadaki `output` ile uyuşmuyor.
- **Çözüm:** Önce `npx prisma generate` komutunu çalıştırın. Dosya import yollarının tam olarak eşleştiğinden emin olun.

---

## 10. Yasaklar

- Raw SQL sorgusu yasak (Prisma query API kullan).
- `any` tipi ile Prisma sonucu cast etme yasak.
- `try-catch` olmadan Prisma çağrısı yasak (Sorgu Sarmalama Kuralı).
- Migration dosyalarını elle düzenleme yasak.
- `prisma.config.ts` içinde `earlyAccess: true` veya `client: { adapter: ... }` kullanımı yasak.
- `@prisma/client` üzerinden doğrudan import yapmak yasak. Her zaman şemada belirtilen çıktı dizinindeki yerel import (`.../generated/client/client.js`) kullanılmalıdır.

---

## Referans

→ Şema tasarımı için bkz. `docs/spec.md` Bölüm 5  
→ Hata formatı için bkz. `docs/spec.md` Bölüm 13
