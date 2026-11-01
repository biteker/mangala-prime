import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig, loadAppConfig } from './app-config';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => loadAppConfig(process.env),
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
