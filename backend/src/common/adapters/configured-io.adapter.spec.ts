import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { ConfiguredIoAdapter } from './configured-io.adapter';
import { AppConfig } from '../config/app-config';

describe('ConfiguredIoAdapter', () => {
  const mockApp = {} as INestApplicationContext;
  const mockConfig: AppConfig = {
    nodeEnv: 'production',
    port: 3000,
    jwtSecret: 'a_very_secure_jwt_secret_at_least_32_chars_long_1',
    jwtRefreshSecret: 'a_very_secure_refresh_secret_at_least_32_chars_2',
    corsOrigins: [
      'https://mangala-prime.egitimhaber.gen.tr',
      'http://localhost:5173',
    ],
    turnTimeLimitSecs: 59,
    databaseUrl: 'postgresql://postgres:password@localhost:5432/mangala_db',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should_enforce_configured_cors_origins_and_credentials_on_socket_server', () => {
    // Arrange
    const superSpy = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue({} as Server);
    const adapter = new ConfiguredIoAdapter(mockApp, mockConfig);

    // Act
    adapter.createIOServer(3000, {
      namespace: '/game',
      cors: { origin: 'http://untrusted-origin.example.com' },
    } as ServerOptions & { namespace: string });

    // Assert
    expect(superSpy).toHaveBeenCalledWith(
      3000,
      expect.objectContaining({
        namespace: '/game',
        cors: {
          origin: [
            'https://mangala-prime.egitimhaber.gen.tr',
            'http://localhost:5173',
          ],
          credentials: true,
        },
      }),
    );
  });

  it('should_apply_cors_options_when_no_initial_options_provided', () => {
    // Arrange
    const superSpy = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue({} as Server);
    const adapter = new ConfiguredIoAdapter(mockApp, mockConfig);

    // Act
    adapter.createIOServer(0);

    // Assert
    expect(superSpy).toHaveBeenCalledWith(0, {
      cors: {
        origin: [
          'https://mangala-prime.egitimhaber.gen.tr',
          'http://localhost:5173',
        ],
        credentials: true,
      },
    });
  });
});
