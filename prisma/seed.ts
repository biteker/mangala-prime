import { PrismaClient } from '../backend/src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is not defined!');
}
const pool = new pg.Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const hash = await bcrypt.hash('test1234', 12);

  // Mevcut test verilerini temizle
  await prisma.moveHistory.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.user.deleteMany({});

  await prisma.user.createMany({
    data: [
      { username: 'player1', passwordHash: hash, eloScore: 1000 },
      { username: 'player2', passwordHash: hash, eloScore: 1200 },
      { username: 'player3', passwordHash: hash, eloScore: 800 },
      { username: 'player4', passwordHash: hash, eloScore: 1500 },
      { username: 'player5', passwordHash: hash, eloScore: 950 },
    ],
  });

  console.log('Seed tamamlandı. 5 test kullanıcısı eklendi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
