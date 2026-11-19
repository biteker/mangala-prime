import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameModule } from '../game/game.module';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TournamentGateway } from './tournament.gateway';

@Module({
  imports: [AuthModule, GameModule],
  controllers: [TournamentController],
  providers: [TournamentService, TournamentGateway],
  exports: [TournamentService],
})
export class TournamentModule {}
