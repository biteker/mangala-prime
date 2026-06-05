import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    seed: 'npx -y tsx seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
