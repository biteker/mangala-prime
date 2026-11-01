// Mock PrismaClient for Jest unit/integration tests to avoid loading Wasm/ESM import.meta engines
export class PrismaClient {
  constructor() {}
  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
  $transaction<T>(promises: Array<Promise<T>>): Promise<T[]> {
    return Promise.all(promises);
  }
}

export const Prisma = {
  LogLevel: {},
};
