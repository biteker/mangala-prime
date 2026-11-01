import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.guard';

export interface HealthCheckResponse {
  readonly status: 'ok';
}

@Controller()
export class AppController {
  @Public()
  @Get('health')
  getHealth(): HealthCheckResponse {
    return { status: 'ok' };
  }
}
