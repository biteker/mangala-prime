import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as express from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './auth.guard';
import { APP_CONFIG, type AppConfig } from '../common/config/app-config';
import { AuthRegisterResponse, AuthLoginResponse, AuthRefreshResponse } from '@mangala/shared';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthRegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AuthLoginResponse> {
    const tokens = await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AuthRefreshResponse> {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Yenileme anahtarı bulunamadı.',
      });
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<void> {
    if (req.user?.id) {
      await this.authService.logout(req.user.id);
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'strict',
    });
  }

  private setRefreshTokenCookie(res: express.Response, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }
}
