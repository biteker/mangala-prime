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
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { LobbyService } from './lobby.service';
import { InviteDto } from './dto/invite.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { LobbyInviteSendPayload, LobbyInviteResponsePayload } from '@mangala/shared';

@WebSocketGateway({ namespace: '/lobby', cors: { origin: '*' } })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server): void {
    this.lobbyService.setServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      let token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        client.disconnect(true);
        return;
      }

      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.substring(7);
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only_1234567890',
      });

      const userId = payload.sub;
      const username = payload.username;
      const ip = client.handshake.address || client.conn.remoteAddress || '127.0.0.1';

      client.data = { userId, username, ip };

      await this.lobbyService.addUser(userId, username, client.id, ip);

      // Bağlanan istemciye lobi çevrimiçi kullanıcı listesini gönder
      const onlineUsers = this.lobbyService.getOnlineUsers().map((u) => ({
        userId: u.userId,
        username: u.username,
        status: u.status,
        elo: u.elo,
      }));
      client.emit('lobby:init_users', onlineUsers);

      // Diğer herkese lobiye girdiğini duyur
      client.broadcast.emit('lobby:user_status', {
        userId,
        status: 'lobby',
      });
    } catch (error) {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = await this.lobbyService.removeUser(client.id);
    if (userId) {
      this.server.emit('lobby:user_status', {
        userId,
        status: 'offline',
      });
    }
  }

  @SubscribeMessage('lobby:queue_join')
  async handleQueueJoin(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = client.data.userId;
    const ip = client.data.ip || '127.0.0.1';
    if (!userId) {
      client.disconnect(true);
      return;
    }

    const result = await this.lobbyService.joinQueue(userId, client.id, ip);

    if (!result.success && result.error) {
      client.emit('lobby:error', {
        error: result.error,
      });
      return;
    }

    // Eşleşme olduysa her iki oyuncuya game:match_found gönder
    if (result.matchDetails) {
      const { matchId, player1, player2 } = result.matchDetails;

      const p1User = this.lobbyService.getOnlineUser(player1.userId);
      const p2User = this.lobbyService.getOnlineUser(player2.userId);

      const p1Elo = p1User ? await this.getPlayerElo(player1.userId) : 1000;
      const p2Elo = p2User ? await this.getPlayerElo(player2.userId) : 1000;

      // Player 1'e haber ver
      this.server.to(player1.socketId).emit('game:match_found', {
        matchId,
        opponentUsername: player2.username,
        opponentElo: p2Elo,
        yourColor: 0,
      });

      // Player 2'e haber ver
      this.server.to(player2.socketId).emit('game:match_found', {
        matchId,
        opponentUsername: player1.username,
        opponentElo: p1Elo,
        yourColor: 1,
      });
    }
  }

  @SubscribeMessage('lobby:queue_leave')
  async handleQueueLeave(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    this.lobbyService.leaveQueue(userId);
  }

  @SubscribeMessage('lobby:invite_send')
  async handleInviteSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LobbyInviteSendPayload,
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    // DTO Validasyonu
    const inviteDto = plainToInstance(InviteDto, payload);
    const errors = await validate(inviteDto);
    if (errors.length > 0) {
      client.emit('lobby:error', {
        error: { code: 'INVALID_PARAMS', message: 'Geçersiz davet parametreleri.' },
      });
      return;
    }

    try {
      const sent = await this.lobbyService.sendInvite(userId, payload.targetUserId);
      if (sent) {
        const target = this.lobbyService.getOnlineUser(payload.targetUserId);
        if (target) {
          this.server.to(target.socketId).emit('lobby:invite_send', {
            inviterUserId: userId,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Davet gönderilemedi.';
      const code = (error as any).response?.code || 'INVITE_FAILED';
      client.emit('lobby:error', {
        error: { code, message },
      });
    }
  }

  @SubscribeMessage('lobby:invite_response')
  async handleInviteResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LobbyInviteResponsePayload,
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (!payload || !payload.inviterUserId) {
      client.emit('lobby:error', {
        error: { code: 'INVALID_PARAMS', message: 'Geçersiz parametreler.' },
      });
      return;
    }

    try {
      const matchResult = await this.lobbyService.handleInviteResponse(
        payload.inviterUserId,
        userId,
        payload.accepted,
      );

      if (matchResult) {
        if (payload.accepted && matchResult.matchId && matchResult.player1 && matchResult.player2) {
          const p1Elo = await this.getPlayerElo(matchResult.player1.userId);
          const p2Elo = await this.getPlayerElo(matchResult.player2.userId);

          // Davet edene (p1) maç bulundu
          this.server.to(matchResult.player1.socketId).emit('game:match_found', {
            matchId: matchResult.matchId,
            opponentUsername: matchResult.player2.username,
            opponentElo: p2Elo,
            yourColor: 0,
          });

          // Kabul edene (p2) maç bulundu
          this.server.to(matchResult.player2.socketId).emit('game:match_found', {
            matchId: matchResult.matchId,
            opponentUsername: matchResult.player1.username,
            opponentElo: p1Elo,
            yourColor: 1,
          });
        } else {
          // Reddedildi, davet edene bildir
          const inviter = this.lobbyService.getOnlineUser(payload.inviterUserId);
          if (inviter) {
            this.server.to(inviter.socketId).emit('lobby:invite_response', {
              targetUserId: userId,
              accepted: false,
            });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Davet yanıtı işlenemedi.';
      const code = (error as any).response?.code || 'INVITE_RESPONSE_FAILED';
      client.emit('lobby:error', {
        error: { code, message },
      });
    }
  }

  // --- Helpers ---

  private async getPlayerElo(userId: string): Promise<number> {
    return this.lobbyService.getPlayerElo(userId);
  }
}
