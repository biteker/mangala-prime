import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyGateway } from './lobby.gateway';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GameModule } from '../game/game.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, AuthModule, GameModule, AdminModule],
  providers: [LobbyService, LobbyGateway],
  exports: [LobbyService],
})
export class LobbyModule {}
