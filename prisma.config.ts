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
