import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only_1234567890',
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
