import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { GameService } from './game/game.service';
import { PrismaService } from './common/prisma/prisma.service';
import { AuthService } from './auth/auth.service';
import { Public } from './auth/auth.guard';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly gameService: GameService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('test-match')
  async createTestMatch(): Promise<any> {
    try {
      // 1. Create or get Player 1
      let p1 = await this.prisma.user.findUnique({ where: { username: 'testplayer1' } });
      if (!p1) {
        await this.authService.register({ username: 'testplayer1', password: 'Test1234!' });
        p1 = await this.prisma.user.findUnique({ where: { username: 'testplayer1' } });
      }

      // 2. Create or get Player 2
      let p2 = await this.prisma.user.findUnique({ where: { username: 'testplayer2' } });
      if (!p2) {
        await this.authService.register({ username: 'testplayer2', password: 'Test1234!' });
        p2 = await this.prisma.user.findUnique({ where: { username: 'testplayer2' } });
      }

      if (!p1 || !p2) {
        return { error: 'Failed to create players' };
      }

      // 3. Generate tokens
      const p1Payload = { sub: p1.id, username: p1.username };
      const p2Payload = { sub: p2.id, username: p2.username };
      
      const p1Token = await this.jwtService.signAsync(p1Payload, {
        secret: process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only_1234567890',
        expiresIn: '1h',
      });
      const p2Token = await this.jwtService.signAsync(p2Payload, {
        secret: process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only_1234567890',
        expiresIn: '1h',
      });

      // 4. Create Match in DB
      const match = await this.prisma.match.create({
        data: {
          player1Id: p1.id,
          player2Id: p2.id,
          status: 'ACTIVE',
        },
      });

      // 5. Initialize game room
      await this.gameService.initializeGame(match.id, p1.id, p2.id);

      return {
        matchId: match.id,
        player1: {
          id: p1.id,
          username: p1.username,
          token: p1Token,
        },
        player2: {
          id: p2.id,
          username: p2.username,
          token: p2Token,
        },
      };
    } catch (error: any) {
      return { error: error.message || error };
    }
  }
}
