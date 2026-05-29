import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    seed: 'ts-node ../prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
