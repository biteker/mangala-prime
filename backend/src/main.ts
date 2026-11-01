import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { loadAppConfig, AppConfig } from './common/config/app-config';
import { ConfiguredIoAdapter } from './common/adapters/configured-io.adapter';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
  let config: AppConfig;
  try {
    config = loadAppConfig(process.env);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Invalid application configuration';
    console.error(`[FATAL] ${message}`);
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  const connectSrcDirectives =
    config.nodeEnv === 'production'
      ? ["'self'", 'wss:']
      : ["'self'", 'wss:', 'ws:'];

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: connectSrcDirectives,
          workerSrc: ["'self'", 'blob:'],
          fontSrc: ["'self'", 'data:'],
        },
      },
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
  });

  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, config));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(config.port, '0.0.0.0');
}
void bootstrap();
