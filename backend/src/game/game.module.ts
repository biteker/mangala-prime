import { Module } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EloModule } from '../elo/elo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, EloModule, AuthModule],
  providers: [GameEngineService, GameService, GameGateway],
  exports: [GameEngineService, GameService],
})
export class GameModule {}
