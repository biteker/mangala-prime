import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { AppConfig } from '../config/app-config';

export class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    appOrHttpServer: INestApplicationContext,
    private readonly config: AppConfig,
  ) {
    super(appOrHttpServer);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const mergedOptions: Partial<ServerOptions> = {
      ...options,
      cors: {
        origin: [...this.config.corsOrigins],
        credentials: true,
      },
    };
    return super.createIOServer(port, mergedOptions) as Server;
  }
}
