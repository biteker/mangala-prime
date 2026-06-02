import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { EloModule } from './elo/elo.module';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { LobbyModule } from './lobby/lobby.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    PrismaModule, 
    EloModule, 
    GameModule, 
    AuthModule, 
    UserModule, 
    LobbyModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)', '/socket.io/(.*)'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

