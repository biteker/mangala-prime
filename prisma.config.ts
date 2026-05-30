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
