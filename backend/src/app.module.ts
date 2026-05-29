import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { EloModule } from './elo/elo.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [PrismaModule, EloModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

