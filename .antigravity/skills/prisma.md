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

**PostgreSQL 16 (`@prisma/adapter-pg`):** Versiyon kontrollü migration kullanılır (`prisma migrate dev` / `prisma migrate deploy`).

```bash
# Yeni migration oluştur (geliştirme ortamı)
npx prisma migrate dev --name aciklayici_isim

# Üretim ortamında bekleyen migration'ları uygula (veri kaybı olmadan)
npx prisma migrate deploy

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
import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'npx -y tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

---

## 6. Yeni `prisma-client` Generator ve Şema Tasarımı

v7'de şema yazarken `prisma-client-js` yerine yeni nesil `prisma-client` kullanılmalıdır. Bu generator kullanılırken `output` parametresinin verilmesi zorunludur, çünkü yeni motor dosyaları doğrudan `node_modules` içine yazmaz.

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider     = "prisma-client"
  output       = "../backend/src/generated/client"
  moduleFormat = "cjs"
}
```

### Kod İçinde Kullanım (İthal Etme)
Yeni generator şemayı belirtilen özel dizine yazdığı için, istemciyi projemize dahil ederken relative yol kullanılmalıdır:

```typescript
// ESKİ YÖNTEM (v5 - GEÇERSİZ/YAVAŞ):
// import { PrismaClient } from '@prisma/client'

// YENİ YÖNTEM (v7 - DOĞRU VE HIZLI):
import { PrismaClient } from '../../generated/client/client.js';
```

---

## 7. `PrismaService` (NestJS Entegrasyonu)

PostgreSQL adaptörü (`@prisma/adapter-pg` ve `pg.Pool`) doğrudan servis başlatılırken `super` çağrısına iletilmelidir. İthalat yolu yeni oluşturulan istemci dizinindeki `client.js` dosyasını hedeflemelidir.

```typescript
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { APP_CONFIG, type AppConfig } from '../config/app-config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: pg.Pool;

  constructor(@Optional() @Inject(APP_CONFIG) config?: AppConfig) {
    const dbUrl = config?.databaseUrl ?? process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not defined!');
    }
    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
```

---

## 8. Veritabanı Tohumlama (Seeding)

Prisma v7, migrate işlemlerinden sonra otomatik seed özelliğini kaldırmıştır. Seeding işlemleri **manuel** olarak tetiklenmelidir (üretim ortamında çalıştırılamaz):
```bash
npx prisma db seed
```

### Örnek Seed Dosyası (`prisma/seed.ts`):
```typescript
import { PrismaClient } from '../backend/src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script cannot be executed when NODE_ENV is production!');
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is not defined!');
}
const pool = new pg.Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
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

## 11. PostgreSQL 18 Mimari Yönergeleri (PostgreSQL 18 Architectural Directives)

1. **JSONB Sorguları:** JSON verileri üzerinde işlem yaparken PostgreSQL 18 uyumlu `JSON_TABLE` ve modern JSON standartlarını kullan.
2. **B-Tree Index Hızlandırması:** Sık güncellenen (Oyun odaları, aktif hamleler vb.) tablolarda B-Tree indeks performans optimizasyonlarını göz önünde bulundur. `VACUUM` dostu şemalar tasarla.
3. **Müşterek Bağlantı Yönetimi:** PostgreSQL 18'in yüksek eşzamanlı bağlantı (High-Concurrency) geliştirmelerinden faydalanmak için ham SQL yazarken connection pooling mimarisine sadık kal.

---

## Referans

→ Şema tasarımı için bkz. `docs/spec.md` Bölüm 5  
→ Hata formatı için bkz. `docs/spec.md` Bölüm 13
