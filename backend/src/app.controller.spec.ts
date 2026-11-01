import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should_return_ok_status_from_health_endpoint', async () => {
    // Arrange
    const interceptor = new ResponseInterceptor<{ status: 'ok' }>();
    const mockContext = {} as ExecutionContext;
    const next: CallHandler = {
      handle: () => of(appController.getHealth()),
    };

    // Act
    const rawResult = appController.getHealth();
    const wrappedResult = await firstValueFrom(interceptor.intercept(mockContext, next));

    // Assert
    expect(rawResult).toEqual({ status: 'ok' });
    expect(wrappedResult).toEqual({ data: { status: 'ok' } });
  });

  it('should_not_expose_createTestMatch_debug_method', () => {
    // Assert
    expect('createTestMatch' in appController).toBe(false);
  });
});
