import { UseFilters } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket, type DefaultEventsMap } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import type { TournamentWatchPayload } from '@mangala/shared';
import { TournamentService } from './tournament.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';

interface TournamentSocketData {
  userId?: string;
  username?: string;
}

export type AuthenticatedTournamentSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  TournamentSocketData
>;

@UseFilters(new WsExceptionFilter())
@WebSocketGateway({ namespace: '/tournament' })
export class TournamentGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tournamentService: TournamentService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server): void {
    this.tournamentService.setServer(server);
  }

  private extractToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as { token?: unknown } | undefined)
      ?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken.startsWith('Bearer ')
        ? authToken.substring(7)
        : authToken;
    }
    return null;
  }

  handleConnection(client: AuthenticatedTournamentSocket): void {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; username: string }>(
        token,
      );
      client.data.userId = payload.sub;
      client.data.username = payload.username;
      this.tournamentService.registerUserSocket(payload.sub, client.id);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedTournamentSocket): void {
    if (client.data.userId) {
      this.tournamentService.unregisterUserSocket(
        client.data.userId,
        client.id,
      );
    }
  }

  @SubscribeMessage('tournament:watch')
  async handleWatch(
    @ConnectedSocket() client: AuthenticatedTournamentSocket,
    @MessageBody() payload: TournamentWatchPayload,
  ): Promise<void> {
    if (payload?.tournamentId) {
      await client.join(`tournament:${payload.tournamentId}`);
    }
  }

  @SubscribeMessage('tournament:unwatch')
  async handleUnwatch(
    @ConnectedSocket() client: AuthenticatedTournamentSocket,
    @MessageBody() payload: TournamentWatchPayload,
  ): Promise<void> {
    if (payload?.tournamentId) {
      await client.leave(`tournament:${payload.tournamentId}`);
    }
  }
}
