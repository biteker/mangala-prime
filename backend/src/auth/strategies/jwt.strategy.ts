import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: { sub: string; username: string }): Promise<{ id: string; username: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Kullanıcı bulunamadı.',
        });
      }
      return { id: user.id, username: user.username };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Kimlik doğrulama başarısız oldu.',
      });
    }
  }
}
