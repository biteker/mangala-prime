import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const dbAbsPath = path.resolve(__dirname, 'prisma', 'dev.db');
const dbUrl = `file:${dbAbsPath}`;

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: dbUrl,
  },
  client: {
    adapter: () => new PrismaLibSql({ url: dbUrl }),
  },
});
