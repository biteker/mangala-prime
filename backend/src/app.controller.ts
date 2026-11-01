import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './auth/auth.guard';

export interface HealthCheckResponse {
  readonly status: 'ok';
}

@Controller()
export class AppController {
  @Public()
  @SkipThrottle()
  @Get('health')
  getHealth(): HealthCheckResponse {
    return { status: 'ok' };
  }
}
