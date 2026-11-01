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
import { GameService } from './game.service';
import { MoveDto } from './dto/move.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type {
  GameMovePayload,
  GameReconnectPayload,
  GameChatTogglePayload,
  GameMessagePayload,
} from '@mangala/shared';
import { GameEndReason } from '@mangala/shared';
import { SlidingWindowLimiter } from '../common/guards/sliding-window-limiter';

interface GameSocketData {
  userId?: string;
  username?: string;
}

export type AuthenticatedGameSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  GameSocketData
>;

@WebSocketGateway({ namespace: '/game' })
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  private readonly connectionLimiter = new SlidingWindowLimiter(20, 60_000);
  private readonly moveLimiter = new SlidingWindowLimiter(10, 5_000);
  private readonly chatLimiter = new SlidingWindowLimiter(5, 10_000);

  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server): void {
    this.gameService.setServer(server);
  }

  private extractClientIp(client: Socket): string {
    const forwardedFor = client.handshake.headers?.['x-forwarded-for'];
    const realIp = client.handshake.headers?.['x-real-ip'];
    let ip =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : typeof realIp === 'string'
          ? realIp.trim()
          : client.handshake.address ||
            client.conn?.remoteAddress ||
            '127.0.0.1';

    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    return ip;
  }

  private extractHandshakeToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as { token?: unknown } | undefined)
      ?.token;
    const queryToken = (
      client.handshake.query as { token?: unknown } | undefined
    )?.token;
    const rawToken =
      typeof authToken === 'string'
        ? authToken
        : typeof queryToken === 'string'
          ? queryToken
          : null;

    if (!rawToken) {
      return null;
    }

    return rawToken.startsWith('Bearer ') ? rawToken.substring(7) : rawToken;
  }

  async handleConnection(client: AuthenticatedGameSocket): Promise<void> {
    try {
      const ip = this.extractClientIp(client);
      if (!this.connectionLimiter.tryConsume(ip)) {
        client.disconnect(true);
        return;
      }

      const token = this.extractHandshakeToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        username: string;
      }>(token);

      const userId = payload.sub;
      const username = payload.username;

      client.data = { userId, username };

      // Oyuncuyu varsa aktif odasına bağla
      await this.gameService.handlePlayerConnect(userId, client.id);

      // Kullanıcının odası varsa socket odasına katılması gerek
      const room = this.gameService.getRoomForUser(userId);
      if (room) {
        await client.join(room.matchId);
      }
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedGameSocket): Promise<void> {
    const disconnectResult = await this.gameService.handlePlayerDisconnect(
      client.id,
    );
    if (disconnectResult) {
      const { matchId, userId } = disconnectResult;

      // Diğer oyuncuya bağlantı koptu bilgisi gitmeli
      this.server.to(matchId).emit('game:player_disconnected', {
        playerId: userId,
        reconnectWindowSecs: 60,
      });
    }
  }

  @SubscribeMessage('game:move')
  async handleMove(
    @ConnectedSocket() client: AuthenticatedGameSocket,
    @MessageBody() payload: GameMovePayload,
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (!this.moveLimiter.tryConsume(userId)) {
      client.emit('game:error', {
        error: {
          code: 'RATE_LIMITED',
          message: 'Çok fazla hamle isteği. Lütfen biraz bekleyin.',
        },
      });
      return;
    }

    // 1. DTO ve Validasyon
    const moveDto = plainToInstance(MoveDto, payload);
    const errors = await validate(moveDto);
    if (errors.length > 0) {
      const room = this.gameService.getRoom(payload.matchId);
      client.emit('game:error', {
        error: {
          code: 'INVALID_MOVE',
          message: 'Geçersiz hamle parametreleri.',
        },
        board: room?.board,
      });
      return;
    }

    // 2. İş mantığı validasyonu (sıra, kuyu sahipliği, dolu olması vb.)
    const validation = await this.gameService.validateMove(client.id, payload);
    if (!validation.valid) {
      client.emit('game:error', {
        error: {
          code: 'INVALID_MOVE',
          message: validation.reason || 'Geçersiz hamle.',
        },
        board: validation.currentBoard,
      });
      return;
    }

    // 3. Hamleyi işle
    try {
      const result = await this.gameService.processMove(payload);

      if (result.gameOver) {
        this.server.to(payload.matchId).emit('game:game_over', {
          matchId: payload.matchId,
          winnerId: result.winnerId,
          reason: GameEndReason.NORMAL,
          p1EloChange: result.p1EloChange,
          p2EloChange: result.p2EloChange,
          finalBoard: result.newBoard,
        });
      } else {
        this.server.to(payload.matchId).emit('game:state_update', {
          board: result.newBoard,
          nextPlayerId: result.nextPlayerId,
          turnTimeLeft: this.gameService.getTurnTimeLimit(),
        });
      }
    } catch {
      client.emit('game:error', {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Hamle işlenirken bir hata oluştu.',
        },
      });
    }
  }

  @SubscribeMessage('game:reconnect')
  async handleReconnect(
    @ConnectedSocket() client: AuthenticatedGameSocket,
    @MessageBody() payload: GameReconnectPayload,
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (!payload || !payload.matchId) {
      client.emit('game:error', {
        error: { code: 'INVALID_PARAMS', message: 'Geçersiz parametreler.' },
      });
      return;
    }

    try {
      const room = await this.gameService.handleReconnect(
        userId,
        payload.matchId,
        client.id,
      );

      await client.join(payload.matchId);

      const opponentUsername =
        userId === room.player1Id ? room.player2Username : room.player1Username;
      const nextPlayerId =
        room.currentPlayer === 0 ? room.player1Id : room.player2Id;
      const yourColor: 0 | 1 = userId === room.player1Id ? 0 : 1;

      client.emit('game:reconnect_ack', {
        board: room.board,
        nextPlayerId,
        turnTimeLeft: room.turnTimeLeft,
        matchId: room.matchId,
        opponentUsername,
        yourColor,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Yeniden bağlanma başarısız oldu.';
      client.emit('game:error', {
        error: { code: 'RECONNECT_FAILED', message: errorMessage },
      });
    }
  }

  @SubscribeMessage('game:abandon')
  async handleAbandon(
    @ConnectedSocket() client: AuthenticatedGameSocket,
    @MessageBody() payload: { matchId: string },
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (!payload || !payload.matchId) {
      client.emit('game:error', {
        error: { code: 'INVALID_PARAMS', message: 'Geçersiz parametreler.' },
      });
      return;
    }

    try {
      await this.gameService.handleAbandon(payload.matchId, userId);
    } catch {
      client.emit('game:error', {
        error: {
          code: 'FORFEIT_FAILED',
          message: 'Oyundan çekilme işlemi başarısız oldu.',
        },
      });
    }
  }

  @SubscribeMessage('game:chat_toggle')
  handleChatToggle(
    @ConnectedSocket() client: AuthenticatedGameSocket,
    @MessageBody() payload: GameChatTogglePayload,
  ): void {
    const userId = client.data.userId;
    if (!userId) return;

    if (!payload || !payload.matchId) return;

    this.gameService.toggleChat(payload.matchId, userId, payload.chatEnabled);

    // Diğer oyuncuyu bilgilendir
    client.to(payload.matchId).emit('game:chat_toggle', {
      matchId: payload.matchId,
      chatEnabled: payload.chatEnabled,
    });
  }

  @SubscribeMessage('game:message')
  handleChatMessage(
    @ConnectedSocket() client: AuthenticatedGameSocket,
    @MessageBody() payload: GameMessagePayload,
  ): void {
    const userId = client.data.userId;
    if (!userId) return;

    if (!this.chatLimiter.tryConsume(userId)) {
      client.emit('game:error', {
        error: {
          code: 'RATE_LIMITED',
          message: 'Çok fazla mesaj gönderildi. Lütfen biraz bekleyin.',
        },
      });
      return;
    }

    if (!payload || !payload.matchId || !payload.message) return;

    // Sanitize message to prevent XSS
    const sanitizedMessage = this.sanitizeMessage(payload.message);

    // Diğer oyuncuya ilet
    client.to(payload.matchId).emit('game:message', {
      matchId: payload.matchId,
      message: sanitizedMessage,
      type: payload.type,
    });
  }

  private sanitizeMessage(message: string): string {
    return message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
