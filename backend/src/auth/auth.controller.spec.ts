import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerModule,
  ThrottlerGuard,
  ThrottlerException,
} from '@nestjs/throttler';
import type { Server } from 'http';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { APP_CONFIG, loadAppConfig } from '../common/config/app-config';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';

describe('AuthController Rate Limiting & Error Format', () => {
  let app: INestApplication;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60_000,
            limit: 600,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: APP_CONFIG, useValue: loadAppConfig(process.env) },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should_reject_61st_login_attempt_within_60s_with_429_RATE_LIMITED_format', async () => {
    // Arrange
    const server = app.getHttpServer() as Server;
    const loginPayload = { username: 'player1', password: 'password123' };

    // Act — first 60 requests within 60s are allowed (school lab capacity)
    for (let i = 0; i < 60; i++) {
      const okResponse = await request(server)
        .post('/auth/login')
        .send(loginPayload);
      expect(okResponse.status).toBe(200);
    }

    // 61st request exceeds the 60 req / 60s throttle limit
    const throttledResponse = await request(server)
      .post('/auth/login')
      .send(loginPayload);

    // Assert
    expect(throttledResponse.status).toBe(429);
    expect(throttledResponse.body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Çok fazla istek. Lütfen biraz bekleyin.',
      },
    });
  });

  it('should_format_throttler_exception_directly_via_http_exception_filter', () => {
    // Arrange
    const filter = new HttpExceptionFilter();
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
      }),
    };

    // Act
    filter.catch(new ThrottlerException(), mockHost as never);

    // Assert
    expect(statusMock).toHaveBeenCalledWith(429);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        code: 'RATE_LIMITED',
        message: 'Çok fazla istek. Lütfen biraz bekleyin.',
      },
    });
  });
});
