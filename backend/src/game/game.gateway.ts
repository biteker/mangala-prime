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
import { GameService } from './game.service';
import { MoveDto } from './dto/move.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { GameMovePayload, GameReconnectPayload, GameChatTogglePayload, GameMessagePayload } from '@mangala/shared';
import { GameEndReason } from '@mangala/shared';

@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server): void {
    this.gameService.setServer(server);
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

      client.data = { userId, username };

      // Oyuncuyu varsa aktif odasına bağla
      await this.gameService.handlePlayerConnect(userId, client.id);
      
      // Kullanıcının odası varsa socket odasına katılması gerek
      const room = this.gameService.getRoomForUser(userId);
      if (room) {
        client.join(room.matchId);
      }
    } catch (error) {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const disconnectResult = await this.gameService.handlePlayerDisconnect(client.id);
    if (disconnectResult) {
      const { matchId, opponentSocketId, userId } = disconnectResult;
      
      // Diğer oyuncuya bağlantı koptu bilgisi gitmeli
      this.server.to(matchId).emit('game:player_disconnected', {
        playerId: userId,
        reconnectWindowSecs: 60,
      });
    }
  }

  @SubscribeMessage('game:move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameMovePayload,
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    // 1. DTO ve Validasyon
    const moveDto = plainToInstance(MoveDto, payload);
    const errors = await validate(moveDto);
    if (errors.length > 0) {
      const room = this.gameService.getRoom(payload.matchId);
      client.emit('game:error', {
        error: { code: 'INVALID_MOVE', message: 'Geçersiz hamle parametreleri.' },
        board: room?.board,
      });
      return;
    }

    // 2. İş mantığı validasyonu (sıra, kuyu sahipliği, dolu olması vb.)
    const validation = await this.gameService.validateMove(client.id, payload);
    if (!validation.valid) {
      client.emit('game:error', {
        error: { code: 'INVALID_MOVE', message: validation.reason || 'Geçersiz hamle.' },
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
          turnTimeLeft: 15,
        });
      }
    } catch (error) {
      client.emit('game:error', {
        error: { code: 'INTERNAL_ERROR', message: 'Hamle işlenirken bir hata oluştu.' },
      });
    }
  }

  @SubscribeMessage('game:reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
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
      const room = await this.gameService.handleReconnect(userId, payload.matchId, client.id);
      
      client.join(payload.matchId);

      const opponentUsername = userId === room.player1Id ? room.player2Username : room.player1Username;
      const nextPlayerId = room.currentPlayer === 0 ? room.player1Id : room.player2Id;
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
      const errorMessage = error instanceof Error ? error.message : 'Yeniden bağlanma başarısız oldu.';
      client.emit('game:error', {
        error: { code: 'RECONNECT_FAILED', message: errorMessage },
      });
    }
  }

  @SubscribeMessage('game:chat_toggle')
  async handleChatToggle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameChatTogglePayload,
  ): Promise<void> {
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
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GameMessagePayload,
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) return;

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
