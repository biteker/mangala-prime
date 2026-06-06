import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Load env from backend/.env if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:dummy_password_for_ci_only@localhost:5432/mangala_db?schema=public';

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'npx -y tsx prisma/seed.ts',
  },
  datasource: {
    url: dbUrl,
  },
});
