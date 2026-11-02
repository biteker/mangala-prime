import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { APP_CONFIG, type AppConfig } from '../common/config/app-config';
import { GameEngineService } from './game-engine.service';
import { EloService } from '../elo/elo.service';
import { FinishedMatchSession, GameRoom } from './types/game-room.types';
import { BoardState, Player, GameEndReason } from '@mangala/shared';
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

export type RematchOfferResult =
  | {
      status: 'offered';
      matchId: string;
      fromUserId: string;
      opponentSocketId: string;
      expiresAt: number;
    }
  | {
      status: 'started';
      oldMatchId: string;
      newMatchId: string;
      newRoom: GameRoom;
    }
  | {
      status: 'ignored';
    };

export type RematchResponseResult =
  | {
      status: 'declined';
      matchId: string;
    }
  | {
      status: 'started';
      oldMatchId: string;
      newMatchId: string;
      newRoom: GameRoom;
    }
  | {
      status: 'ignored';
    };

const REMATCH_TIMEOUT_MS = 30_000;

@Injectable()
export class GameService {
  private readonly rooms = new Map<string, GameRoom>();
  private readonly finishedMatches = new Map<string, FinishedMatchSession>();
  private readonly completedRematches = new Set<string>();
  private readonly reconnectTimers = new Map<string, NodeJS.Timeout>();
  private server: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameEngine: GameEngineService,
    private readonly eloService: EloService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  getTurnTimeLimit(): number {
    return this.config.turnTimeLimitSecs;
  }

  setServer(server: Server): void {
    this.server = server;
  }

  getRoom(matchId: string): GameRoom | undefined {
    return this.rooms.get(matchId);
  }

  getFinishedMatch(matchId: string): FinishedMatchSession | undefined {
    return this.finishedMatches.get(matchId);
  }

  getRoomForUser(userId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.player1Id === userId || room.player2Id === userId) {
        return room;
      }
    }
    return undefined;
  }

  async initializeGame(
    matchId: string,
    player1Id: string,
    player2Id: string,
  ): Promise<GameRoom> {
    try {
      const p1 = await this.prisma.user.findUnique({
        where: { id: player1Id },
      });
      const p2 = await this.prisma.user.findUnique({
        where: { id: player2Id },
      });

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
        turnTimeLeft: this.getTurnTimeLimit(),
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

  handlePlayerConnect(userId: string, socketId: string): Promise<void> {
    // Kullanıcının içinde olduğu aktif odayı bul
    for (const room of this.rooms.values()) {
      if (room.player1Id === userId) {
        room.player1SocketId = socketId;
        this.clearReconnectTimer(userId);

        // Sıra bu oyuncudaysa ve timer kilitliyse (yani socketId boştayken kilitlendiyse) timer'ı başlat
        if (room.currentPlayer === 0 && !room.timer) {
          this.resumeTurnTimer(room);
        }
        break;
      } else if (room.player2Id === userId) {
        room.player2SocketId = socketId;
        this.clearReconnectTimer(userId);

        if (room.currentPlayer === 1 && !room.timer) {
          this.resumeTurnTimer(room);
        }
        break;
      }
    }

    for (const session of this.finishedMatches.values()) {
      if (session.player1Id === userId) {
        session.player1SocketId = socketId;
      } else if (session.player2Id === userId) {
        session.player2SocketId = socketId;
      }
    }

    return Promise.resolve();
  }

  handlePlayerDisconnect(socketId: string): Promise<{
    matchId: string;
    opponentSocketId: string;
    userId: string;
  } | null> {
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
        const isCurrentPlayer =
          (disconnectedUserId === room.player1Id && room.currentPlayer === 0) ||
          (disconnectedUserId === room.player2Id && room.currentPlayer === 1);

        if (isCurrentPlayer) {
          this.freezeTurnTimer(room);
        }

        // 60 saniyelik reconnect sayacı başlat
        this.startReconnectTimer(room.matchId, disconnectedUserId);

        return Promise.resolve({
          matchId: room.matchId,
          opponentSocketId,
          userId: disconnectedUserId,
        });
      }
    }

    // Tamamlanmış maçta oyunculardan biri ayrılırsa (lobiye dönerse) bekleyen rövanş teklifini iptal et
    for (const [fMatchId, session] of this.finishedMatches.entries()) {
      if (
        session.player1SocketId === socketId ||
        session.player2SocketId === socketId
      ) {
        if (session.offer) {
          clearTimeout(session.offer.timer);
          session.offer = null;
          if (this.server) {
            this.server
              .to(fMatchId)
              .emit('game:rematch_declined', { matchId: fMatchId });
          }
        }
        this.finishedMatches.delete(fMatchId);
        break;
      }
    }

    return Promise.resolve(null);
  }

  handleReconnect(
    userId: string,
    matchId: string,
    socketId: string,
  ): Promise<GameRoom> {
    const room = this.rooms.get(matchId);
    if (!room) {
      return Promise.reject(
        new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Oyun odası bulunamadı.',
        }),
      );
    }

    if (room.player1Id !== userId && room.player2Id !== userId) {
      return Promise.reject(
        new BadRequestException({
          code: 'INVALID_PLAYER',
          message: 'Bu maça dahil değilsiniz.',
        }),
      );
    }

    if (room.player1Id === userId) {
      room.player1SocketId = socketId;
    } else {
      room.player2SocketId = socketId;
    }

    this.clearReconnectTimer(userId);

    // Sıra bu oyuncudaysa ve timer kilitliyse timer'ı başlat
    const isCurrentPlayer =
      (userId === room.player1Id && room.currentPlayer === 0) ||
      (userId === room.player2Id && room.currentPlayer === 1);

    if (isCurrentPlayer && !room.timer) {
      this.resumeTurnTimer(room);
    }

    return Promise.resolve(room);
  }

  validateMove(
    socketId: string,
    payload: GameMovePayload,
  ): Promise<MoveValidationResult> {
    const room = this.rooms.get(payload.matchId);
    if (!room) {
      return Promise.resolve({ valid: false, reason: 'Maç bulunamadı.' });
    }

    let playerIndex: Player;
    if (room.player1SocketId === socketId) {
      playerIndex = 0;
    } else if (room.player2SocketId === socketId) {
      playerIndex = 1;
    } else {
      return Promise.resolve({
        valid: false,
        reason: 'Bu maçta oyuncu değilsiniz.',
      });
    }

    if (room.currentPlayer !== playerIndex) {
      return Promise.resolve({
        valid: false,
        reason: 'Sıra sizde değil.',
        currentBoard: room.board,
      });
    }

    const isP1 = playerIndex === 0;
    const playerStartPit = isP1 ? 0 : 7;
    const playerEndPit = isP1 ? 5 : 12;

    if (payload.pitIndex < playerStartPit || payload.pitIndex > playerEndPit) {
      return Promise.resolve({
        valid: false,
        reason: 'Kendi bölgenizdeki bir kuyudan hamle yapmalısınız.',
        currentBoard: room.board,
      });
    }

    if (room.board[payload.pitIndex] === 0) {
      return Promise.resolve({
        valid: false,
        reason: 'Seçilen kuyu boş.',
        currentBoard: room.board,
      });
    }

    return Promise.resolve({ valid: true });
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

    const movingPlayerId =
      room.currentPlayer === 0 ? room.player1Id : room.player2Id;
    const engineResult = this.gameEngine.processMove(
      room.board,
      payload.pitIndex,
      room.currentPlayer,
    );

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
    } catch {
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

      this.finishedMatches.set(room.matchId, {
        matchId: room.matchId,
        player1Id: room.player1Id,
        player2Id: room.player2Id,
        player1Username: room.player1Username,
        player2Username: room.player2Username,
        player1SocketId: room.player1SocketId,
        player2SocketId: room.player2SocketId,
        offer: null,
        isCreatingRematch: false,
      });

      this.cleanUpRoom(room.matchId);
    } else {
      // Oyun devam ediyorsa sonraki oyuncunun durumuna bak
      const nextSocketId =
        room.currentPlayer === 0 ? room.player1SocketId : room.player2SocketId;
      if (nextSocketId) {
        // Oyuncu bağlıysa turn timer'ını başlat
        this.startTurnTimer(room.matchId);
      } else {
        // Oyuncu koptuysa turn timer'ı kilitli tut
        room.turnTimeLeft = this.getTurnTimeLimit();
      }
    }

    const nextPlayerId =
      room.currentPlayer === 0 ? room.player1Id : room.player2Id;

    return {
      newBoard: room.board,
      nextPlayerId,
      gameOver: engineResult.gameOver,
      winnerId,
      p1EloChange,
      p2EloChange,
    };
  }

  async handleTimeout(
    matchId: string,
    timedOutPlayerId: string,
  ): Promise<void> {
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
    } catch {
      // Hata durumunda logla
    } finally {
      this.finishedMatches.set(room.matchId, {
        matchId: room.matchId,
        player1Id: room.player1Id,
        player2Id: room.player2Id,
        player1Username: room.player1Username,
        player2Username: room.player2Username,
        player1SocketId: room.player1SocketId,
        player2SocketId: room.player2SocketId,
        offer: null,
        isCreatingRematch: false,
      });
      this.cleanUpRoom(matchId);
    }
  }

  async handleAbandon(
    matchId: string,
    forfeitingPlayerId: string,
  ): Promise<void> {
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
    } catch {
      // log error
    } finally {
      this.finishedMatches.set(room.matchId, {
        matchId: room.matchId,
        player1Id: room.player1Id,
        player2Id: room.player2Id,
        player1Username: room.player1Username,
        player2Username: room.player2Username,
        player1SocketId: room.player1SocketId,
        player2SocketId: room.player2SocketId,
        offer: null,
        isCreatingRematch: false,
      });
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

  async offerRematch(
    matchId: string,
    userId: string,
  ): Promise<RematchOfferResult> {
    if (this.rooms.has(matchId)) {
      throw new BadRequestException({
        code: 'MATCH_NOT_FINISHED',
        message: 'Bitmemiş bir maç için rövanş teklif edilemez.',
      });
    }

    if (this.completedRematches.has(matchId)) {
      return { status: 'ignored' };
    }

    const session = this.finishedMatches.get(matchId);
    if (!session) {
      throw new BadRequestException({
        code: 'MATCH_NOT_FINISHED',
        message: 'Rövanş teklif edilebilecek tamamlanmış maç bulunamadı.',
      });
    }

    if (session.player1Id !== userId && session.player2Id !== userId) {
      throw new BadRequestException({
        code: 'INVALID_PLAYER',
        message: 'Bu maçta oyuncu değilsiniz.',
      });
    }

    if (!session.player1SocketId || !session.player2SocketId) {
      throw new BadRequestException({
        code: 'OPPONENT_OFFLINE',
        message: 'Rakip oyuncu ayrıldığı için rövanş teklif edilemez.',
      });
    }

    try {
      const dbMatch = await this.prisma.match.findUnique({
        where: { id: matchId },
      });
      if (!dbMatch || dbMatch.status !== 'FINISHED') {
        throw new BadRequestException({
          code: 'MATCH_NOT_FINISHED',
          message:
            'Yalnızca tamamlanmış (FINISHED) maçlar için rövanş teklif edilebilir.',
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException({
        code: 'DATABASE_ERROR',
        message: 'Maç durumu kontrol edilirken veritabanı hatası oluştu.',
      });
    }

    if (session.isCreatingRematch) {
      return { status: 'ignored' };
    }

    if (session.offer) {
      if (session.offer.fromUserId === userId) {
        throw new BadRequestException({
          code: 'REMATCH_ALREADY_OFFERED',
          message: 'Zaten aktif bir rövanş teklifiniz var.',
        });
      }
      // Karşı oyuncu zaten teklif ettiyse eşzamanlı teklifi kabul olarak değerlendir
      const responseResult = await this.respondToRematch(matchId, userId, true);
      if (responseResult.status === 'started') {
        return responseResult;
      }
      return { status: 'ignored' };
    }

    const expiresAt = Date.now() + REMATCH_TIMEOUT_MS;
    const timer = setTimeout(() => {
      this.handleRematchTimeout(matchId);
    }, REMATCH_TIMEOUT_MS);

    session.offer = {
      fromUserId: userId,
      expiresAt,
      timer,
    };

    const opponentSocketId =
      userId === session.player1Id
        ? session.player2SocketId
        : session.player1SocketId;

    return {
      status: 'offered',
      matchId,
      fromUserId: userId,
      opponentSocketId,
      expiresAt,
    };
  }

  async respondToRematch(
    matchId: string,
    userId: string,
    accept: boolean,
  ): Promise<RematchResponseResult> {
    if (this.completedRematches.has(matchId)) {
      return { status: 'ignored' };
    }

    const session = this.finishedMatches.get(matchId);
    if (!session) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_REMATCH_OFFER',
        message: 'Aktif bir rövanş teklifi bulunamadı.',
      });
    }

    if (session.isCreatingRematch) {
      return { status: 'ignored' };
    }

    if (!session.offer) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_REMATCH_OFFER',
        message: 'Aktif bir rövanş teklifi bulunamadı.',
      });
    }

    if (
      userId === session.offer.fromUserId ||
      (userId !== session.player1Id && userId !== session.player2Id)
    ) {
      throw new BadRequestException({
        code: 'INVALID_REMATCH_RESPONSE',
        message: 'Bu rövanş teklifine yanıt veremezsiniz.',
      });
    }

    clearTimeout(session.offer.timer);
    session.offer = null;

    if (!accept) {
      this.finishedMatches.delete(matchId);
      return {
        status: 'declined',
        matchId,
      };
    }

    if (!session.player1SocketId || !session.player2SocketId) {
      this.finishedMatches.delete(matchId);
      throw new BadRequestException({
        code: 'OPPONENT_OFFLINE',
        message: 'Rakip oyuncu ayrıldığı için rövanş başlatılamadı.',
      });
    }

    // Yarış durumuna (çift kabul) karşı senkron kilit
    session.isCreatingRematch = true;

    const newPlayer1Id = session.player2Id;
    const newPlayer2Id = session.player1Id;
    const newP1SocketId = session.player2SocketId;
    const newP2SocketId = session.player1SocketId;

    try {
      const oldMatch = await this.prisma.match.findUnique({
        where: { id: matchId },
      });
      const isFriendly = Boolean(oldMatch?.isFriendly);

      const newMatch = await this.prisma.match.create({
        data: {
          player1Id: newPlayer1Id,
          player2Id: newPlayer2Id,
          status: 'ACTIVE',
          isFriendly,
        },
      });

      const newRoom = await this.initializeGame(
        newMatch.id,
        newPlayer1Id,
        newPlayer2Id,
      );
      newRoom.player1SocketId = newP1SocketId;
      newRoom.player2SocketId = newP2SocketId;

      this.completedRematches.add(matchId);
      this.finishedMatches.delete(matchId);

      return {
        status: 'started',
        oldMatchId: matchId,
        newMatchId: newMatch.id,
        newRoom,
      };
    } catch (error) {
      session.isCreatingRematch = false;
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'DATABASE_ERROR',
        message: 'Rövanş maçı oluşturulurken veritabanı hatası oluştu.',
      });
    }
  }

  private handleRematchTimeout(matchId: string): void {
    const session = this.finishedMatches.get(matchId);
    if (!session || !session.offer || session.isCreatingRematch) {
      return;
    }

    clearTimeout(session.offer.timer);
    session.offer = null;
    this.finishedMatches.delete(matchId);

    if (this.server) {
      this.server.to(matchId).emit('game:rematch_declined', { matchId });
    }
  }

  // --- Turn Timer Helpers ---

  private startTurnTimer(matchId: string): void {
    const room = this.rooms.get(matchId);
    if (!room) return;

    if (room.timer) {
      clearTimeout(room.timer);
    }

    room.turnTimeLeft = this.getTurnTimeLimit();
    room.turnExpiresAt = Date.now() + this.getTurnTimeLimit() * 1000;

    room.timer = setTimeout(() => {
      const timedOutPlayerId =
        room.currentPlayer === 0 ? room.player1Id : room.player2Id;
      void this.handleTimeout(matchId, timedOutPlayerId);
    }, this.getTurnTimeLimit() * 1000);
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

    const limit = this.getTurnTimeLimit();
    const msLeft = Math.max(
      100,
      room.turnTimeLeft * (room.turnTimeLeft <= limit ? 1000 : 1),
    );
    room.turnExpiresAt = Date.now() + msLeft;

    room.timer = setTimeout(() => {
      const timedOutPlayerId =
        room.currentPlayer === 0 ? room.player1Id : room.player2Id;
      void this.handleTimeout(room.matchId, timedOutPlayerId);
    }, msLeft);
  }

  // --- Reconnect Timer Helpers ---

  private startReconnectTimer(
    matchId: string,
    disconnectedUserId: string,
  ): void {
    this.clearReconnectTimer(disconnectedUserId);

    const timeout = setTimeout(() => {
      void this.handleDisconnectTimeout(matchId, disconnectedUserId);
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

  private async handleDisconnectTimeout(
    matchId: string,
    disconnectedUserId: string,
  ): Promise<void> {
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
    } catch {
      // log error
    } finally {
      this.cleanUpRoom(matchId);
    }
  }
}
