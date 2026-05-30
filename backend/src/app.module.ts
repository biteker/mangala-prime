import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { EloModule } from './elo/elo.module';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { LobbyModule } from './lobby/lobby.module';

@Module({
  imports: [PrismaModule, EloModule, GameModule, AuthModule, UserModule, LobbyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

