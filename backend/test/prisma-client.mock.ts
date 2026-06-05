// Mock PrismaClient for Jest unit/integration tests to avoid loading Wasm/ESM import.meta engines
export class PrismaClient {
  constructor() {}
  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
  $transaction(promises: any[]): Promise<any[]> {
    return Promise.all(promises);
  }
}

export const Prisma = {
  LogLevel: {},
};
