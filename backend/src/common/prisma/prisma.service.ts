import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/client/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as path from 'path';

function createAdapter(): PrismaLibSql {
  const dbAbsPath = path.resolve(process.cwd(), '..', 'prisma', 'dev.db');
  const dbUrl = process.env['DATABASE_URL'] ?? `file:${dbAbsPath}`;
  return new PrismaLibSql({ url: dbUrl });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
