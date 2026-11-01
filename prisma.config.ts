import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// Load env from backend/.env if DATABASE_URL is not set
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
