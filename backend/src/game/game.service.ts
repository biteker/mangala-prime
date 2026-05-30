import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GameEngineService } from './game-engine.service';
import { EloService } from '../elo/elo.service';
import { GameRoom } from './types/game-room.types';
import { BoardState, Player, MatchStatus, GameEndReason } from '@mangala/shared';
import { GameMovePayload } from '@mangala/shared';
import { Server } from 'socket.io';

export interface MoveValidationResult {
  valid: boolean;
  reason?: string;
  currentBoard?: BoardState;
}

export interface ProcessMoveResult {
  newBoard: BoardState;
  nextPlayerId: string;
  gameOver: boolean;
  winnerId?: string;
  p1EloChange?: number;
  p2EloChange?: number;
}

@Injectable()
export class GameService {
  private readonly rooms = new Map<string, GameRoom>();
  private readonly reconnectTimers = new Map<string, NodeJS.Timeout>();
  private server: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameEngine: GameEngineService,
    private readonly eloService: EloService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  getRoom(matchId: string): GameRoom | undefined {
    return this.rooms.get(matchId);
  }

  getRoomForUser(userId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.player1Id === userId || room.player2Id === userId) {
        return room;
      }
    }
    return undefined;
  }

  async initializeGame(matchId: string, player1Id: string, player2Id: string): Promise<GameRoom> {
    try {
      const p1 = await this.prisma.user.findUnique({ where: { id: player1Id } });
      const p2 = await this.prisma.user.findUnique({ where: { id: player2Id } });

      if (!p1 || !p2) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Oyuncu profili bulunamadı.',
        });
      }

      // Mangala başlangıç tahtası: her kuyuda 4 taş, hazineler 0
      const board: BoardState = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];

      const room: GameRoom = {
        matchId,
        player1Id,
        player2Id,
        player1Username: p1.username,
        player2Username: p2.username,
        player1SocketId: '',
        player2SocketId: '',
        board,
        currentPlayer: 0,
        timer: null,
        turnTimeLeft: 15,
        p1ChatEnabled: true,
        p2ChatEnabled: true,
      };

      this.rooms.set(matchId, room);
      this.startTurnTimer(matchId);

      return room;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Oyun odası kurulurken veritabanı hatası oluştu.',
      });
    }
  }

  async handlePlayerConnect(userId: string, socketId: string): Promise<void> {
    console.log('DEBUG handlePlayerConnect:', { userId, socketId, roomsCount: this.rooms.size });
    // Kullanıcının içinde olduğu aktif odayı bul
    for (const room of this.rooms.values()) {
      if (room.player1Id === userId) {
        room.player1SocketId = socketId;
        console.log('DEBUG handlePlayerConnect P1 matched:', { matchId: room.matchId, socketId });
        this.clearReconnectTimer(userId);
        
        // Sıra bu oyuncudaysa ve timer kilitliyse (yani socketId boştayken kilitlendiyse) timer'ı başlat
        if (room.currentPlayer === 0 && !room.timer) {
          this.resumeTurnTimer(room);
        }
        break;
      } else if (room.player2Id === userId) {
        room.player2SocketId = socketId;
        console.log('DEBUG handlePlayerConnect P2 matched:', { matchId: room.matchId, socketId });
        this.clearReconnectTimer(userId);

        if (room.currentPlayer === 1 && !room.timer) {
          this.resumeTurnTimer(room);
        }
        break;
      }
    }
  }

  async handlePlayerDisconnect(socketId: string): Promise<{ matchId: string; opponentSocketId: string; userId: string } | null> {
    for (const room of this.rooms.values()) {
      let disconnectedUserId = '';
      let opponentSocketId = '';

      if (room.player1SocketId === socketId) {
        room.player1SocketId = '';
        disconnectedUserId = room.player1Id;
        opponentSocketId = room.player2SocketId;
      } else if (room.player2SocketId === socketId) {
        room.player2SocketId = '';
        disconnectedUserId = room.player2Id;
        opponentSocketId = room.player1SocketId;
      }

      if (disconnectedUserId) {
        // Sıradaki oyuncu koptuysa turn timer'ı dondur
        const isCurrentPlayer = (disconnectedUserId === room.player1Id && room.currentPlayer === 0) ||
                                (disconnectedUserId === room.player2Id && room.currentPlayer === 1);
        
        if (isCurrentPlayer) {
          this.freezeTurnTimer(room);
        }

        // 60 saniyelik reconnect sayacı başlat
        this.startReconnectTimer(room.matchId, disconnectedUserId);

        return {
          matchId: room.matchId,
          opponentSocketId,
          userId: disconnectedUserId,
        };
      }
    }
    return null;
  }

  async handleReconnect(userId: string, matchId: string, socketId: string): Promise<GameRoom> {
    const room = this.rooms.get(matchId);
    if (!room) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Oyun odası bulunamadı.',
      });
    }

    if (room.player1Id !== userId && room.player2Id !== userId) {
      throw new BadRequestException({
        code: 'INVALID_PLAYER',
        message: 'Bu maça dahil değilsiniz.',
      });
    }

    if (room.player1Id === userId) {
      room.player1SocketId = socketId;
    } else {
      room.player2SocketId = socketId;
    }

    this.clearReconnectTimer(userId);

    // Sıra bu oyuncudaysa ve timer kilitliyse timer'ı başlat
    const isCurrentPlayer = (userId === room.player1Id && room.currentPlayer === 0) ||
                            (userId === room.player2Id && room.currentPlayer === 1);
    
    if (isCurrentPlayer && !room.timer) {
      this.resumeTurnTimer(room);
    }

    return room;
  }

  async validateMove(socketId: string, payload: GameMovePayload): Promise<MoveValidationResult> {
    const room = this.rooms.get(payload.matchId);
    if (!room) {
      return { valid: false, reason: 'Maç bulunamadı.' };
    }

    let playerIndex: Player;
    if (room.player1SocketId === socketId) {
      playerIndex = 0;
    } else if (room.player2SocketId === socketId) {
      playerIndex = 1;
    } else {
      return { valid: false, reason: 'Bu maçta oyuncu değilsiniz.' };
    }

    console.log('DEBUG validateMove:', {
      socketId,
      player1SocketId: room.player1SocketId,
      player2SocketId: room.player2SocketId,
      player1Id: room.player1Id,
      player2Id: room.player2Id,
      currentPlayer: room.currentPlayer,
    });

    if (room.currentPlayer !== playerIndex) {
      return { valid: false, reason: 'Sıra sizde değil.', currentBoard: room.board };
    }

    const isP1 = playerIndex === 0;
    const playerStartPit = isP1 ? 0 : 7;
    const playerEndPit = isP1 ? 5 : 12;

    if (payload.pitIndex < playerStartPit || payload.pitIndex > playerEndPit) {
      return { valid: false, reason: 'Kendi bölgenizdeki bir kuyudan hamle yapmalısınız.', currentBoard: room.board };
    }

    if (room.board[payload.pitIndex] === 0) {
      return { valid: false, reason: 'Seçilen kuyu boş.', currentBoard: room.board };
    }

    return { valid: true };
  }

  async processMove(payload: GameMovePayload): Promise<ProcessMoveResult> {
    const room = this.rooms.get(payload.matchId);
    if (!room) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Maç bulunamadı.',
      });
    }

    // Aktif turn timer'ı sıfırla
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }

    const movingPlayerId = room.currentPlayer === 0 ? room.player1Id : room.player2Id;
    const engineResult = this.gameEngine.processMove(room.board, payload.pitIndex, room.currentPlayer);

    // Hamle geçmişini veritabanına kaydet
    try {
      await this.prisma.moveHistory.create({
        data: {
          matchId: room.matchId,
          playerId: movingPlayerId,
          pitIndex: payload.pitIndex,
          boardState: JSON.stringify(engineResult.newBoard),
        },
      });
    } catch (dbError) {
      // Hata durumunda loglanır, ancak oyunu bozmamak için kesinti yapılmaz
    }

    room.board = engineResult.newBoard;
    room.currentPlayer = engineResult.nextPlayer;

    let p1EloChange: number | undefined;
    let p2EloChange: number | undefined;
    let winnerId: string | undefined;

    if (engineResult.gameOver) {
      let resultOption: 'p1_win' | 'p2_win' | 'draw';
      if (engineResult.winner === 0) {
        resultOption = 'p1_win';
        winnerId = room.player1Id;
      } else if (engineResult.winner === 1) {
        resultOption = 'p2_win';
        winnerId = room.player2Id;
      } else {
        resultOption = 'draw';
      }

      const eloChanges = await this.eloService.updateEloScores(
        room.matchId,
        room.player1Id,
        room.player2Id,
        resultOption,
      );

      p1EloChange = eloChanges.p1EloChange;
      p2EloChange = eloChanges.p2EloChange;

      this.cleanUpRoom(room.matchId);
    } else {
      // Oyun devam ediyorsa sonraki oyuncunun durumuna bak
      const nextSocketId = room.currentPlayer === 0 ? room.player1SocketId : room.player2SocketId;
      if (nextSocketId) {
        // Oyuncu bağlıysa turn timer'ını başlat
        this.startTurnTimer(room.matchId);
      } else {
        // Oyuncu koptuysa turn timer'ı kilitli tut
        room.turnTimeLeft = 15;
      }
    }

    const nextPlayerId = room.currentPlayer === 0 ? room.player1Id : room.player2Id;

    return {
      newBoard: room.board,
      nextPlayerId,
      gameOver: engineResult.gameOver,
      winnerId,
      p1EloChange,
      p2EloChange,
    };
  }

  async handleTimeout(matchId: string, timedOutPlayerId: string): Promise<void> {
    const room = this.rooms.get(matchId);
    if (!room) return;

    const isP1 = timedOutPlayerId === room.player1Id;
    const opponentId = isP1 ? room.player2Id : room.player1Id;
    const resultOption = isP1 ? 'p1_forfeit' : 'p2_forfeit';

    try {
      const eloChanges = await this.eloService.updateEloScores(
        room.matchId,
        room.player1Id,
        room.player2Id,
        resultOption,
      );

      if (this.server) {
        this.server.to(matchId).emit('game:game_over', {
          matchId,
          winnerId: opponentId,
          reason: GameEndReason.TIMEOUT,
          p1EloChange: eloChanges.p1EloChange,
          p2EloChange: eloChanges.p2EloChange,
          finalBoard: room.board,
        });
      }
    } catch (error) {
      // Hata durumunda logla
    } finally {
      this.cleanUpRoom(matchId);
    }
  }

  async handleAbandon(matchId: string, forfeitingPlayerId: string): Promise<void> {
    const room = this.rooms.get(matchId);
    if (!room) return;

    const isP1 = forfeitingPlayerId === room.player1Id;
    const opponentId = isP1 ? room.player2Id : room.player1Id;
    const resultOption = isP1 ? 'p1_forfeit' : 'p2_forfeit';

    try {
      const eloChanges = await this.eloService.updateEloScores(
        room.matchId,
        room.player1Id,
        room.player2Id,
        resultOption,
      );

      if (this.server) {
        this.server.to(matchId).emit('game:game_over', {
          matchId,
          winnerId: opponentId,
          reason: GameEndReason.FORFEIT,
          p1EloChange: eloChanges.p1EloChange,
          p2EloChange: eloChanges.p2EloChange,
          finalBoard: room.board,
        });
      }
    } catch (error) {
      // log error
    } finally {
      this.cleanUpRoom(matchId);
    }
  }

  toggleChat(matchId: string, userId: string, chatEnabled: boolean): void {
    const room = this.rooms.get(matchId);
    if (!room) return;

    if (room.player1Id === userId) {
      room.p1ChatEnabled = chatEnabled;
    } else if (room.player2Id === userId) {
      room.p2ChatEnabled = chatEnabled;
    }
  }

  cleanUpRoom(matchId: string): void {
    const room = this.rooms.get(matchId);
    if (!room) return;

    if (room.timer) {
      clearTimeout(room.timer);
    }

    this.clearReconnectTimer(room.player1Id);
    this.clearReconnectTimer(room.player2Id);

    this.rooms.delete(matchId);
  }

  // --- Turn Timer Helpers ---

  private startTurnTimer(matchId: string): void {
    const room = this.rooms.get(matchId);
    if (!room) return;

    if (room.timer) {
      clearTimeout(room.timer);
    }

    room.turnTimeLeft = 15;
    room.turnExpiresAt = Date.now() + 15000;

    room.timer = setTimeout(async () => {
      const timedOutPlayerId = room.currentPlayer === 0 ? room.player1Id : room.player2Id;
      await this.handleTimeout(matchId, timedOutPlayerId);
    }, 15000);
  }

  private freezeTurnTimer(room: GameRoom): void {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    if (room.turnExpiresAt) {
      room.turnTimeLeft = Math.max(0, room.turnExpiresAt - Date.now());
    }
  }

  private resumeTurnTimer(room: GameRoom): void {
    if (room.timer) {
      clearTimeout(room.timer);
    }

    const msLeft = Math.max(100, room.turnTimeLeft * (room.turnTimeLeft <= 15 ? 1000 : 1));
    room.turnExpiresAt = Date.now() + msLeft;

    room.timer = setTimeout(async () => {
      const timedOutPlayerId = room.currentPlayer === 0 ? room.player1Id : room.player2Id;
      await this.handleTimeout(room.matchId, timedOutPlayerId);
    }, msLeft);
  }

  // --- Reconnect Timer Helpers ---

  private startReconnectTimer(matchId: string, disconnectedUserId: string): void {
    this.clearReconnectTimer(disconnectedUserId);

    const timeout = setTimeout(async () => {
      await this.handleDisconnectTimeout(matchId, disconnectedUserId);
    }, 60000);

    this.reconnectTimers.set(disconnectedUserId, timeout);
  }

  private clearReconnectTimer(userId: string): void {
    const timeout = this.reconnectTimers.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimers.delete(userId);
    }
  }

  private async handleDisconnectTimeout(matchId: string, disconnectedUserId: string): Promise<void> {
    const room = this.rooms.get(matchId);
    if (!room) return;

    const isP1 = disconnectedUserId === room.player1Id;
    const opponentId = isP1 ? room.player2Id : room.player1Id;
    const resultOption = isP1 ? 'p1_forfeit' : 'p2_forfeit';

    try {
      const eloChanges = await this.eloService.updateEloScores(
        room.matchId,
        room.player1Id,
        room.player2Id,
        resultOption,
      );

      if (this.server) {
        this.server.to(matchId).emit('game:game_over', {
          matchId,
          winnerId: opponentId,
          reason: GameEndReason.DISCONNECT,
          p1EloChange: eloChanges.p1EloChange,
          p2EloChange: eloChanges.p2EloChange,
          finalBoard: room.board,
        });
      }
    } catch (error) {
      // log error
    } finally {
      this.cleanUpRoom(matchId);
    }
  }
}
