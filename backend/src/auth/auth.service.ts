import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { AuthRegisterResponse } from '@mangala/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthRegisterResponse> {
    const { username, password } = registerDto;

    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Bu kullanıcı adı zaten alınmış.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await this.prisma.user.create({
        data: {
          username,
          passwordHash,
          eloScore: 1000,
          wins: 0,
          losses: 0,
        },
      });

      return {
        userId: user.id,
        username: user.username,
      };
    } catch (error) {
      console.error('Registration Error:', error);
      if (error instanceof ConflictException) throw error;
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Kayıt sırasında bir hata oluştu.',
      });
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { username, password } = loginDto;

    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Kullanıcı adı veya şifre hatalı.',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Kullanıcı adı veya şifre hatalı.',
        });
      }

      const tokens = await this.generateTokens(user.id, user.username);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Giriş sırasında bir hata oluştu.',
      });
    }
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key_for_dev_only_0987654321',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Geçersiz veya süresi dolmuş yenileme anahtarı.',
        });
      }

      const tokens = await this.generateTokens(user.id, user.username);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Geçersiz veya süresi dolmuş yenileme anahtarı.',
      });
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    } catch (error) {
      // Fail silently
    }
  }

  private async generateTokens(userId: string, username: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, username };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only_1234567890',
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key_for_dev_only_0987654321',
        expiresIn: '30d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
