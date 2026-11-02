import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { EloService } from '../elo/elo.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { APP_CONFIG, loadAppConfig } from '../common/config/app-config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Server } from 'socket.io';

describe('GameService', () => {
  let service: GameService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    moveHistory: {
      create: jest.fn(),
    },
  };

  const mockEloService = {
    updateEloScores: jest.fn(),
  };

  const mockGameEngine = {
    processMove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GameEngineService, useValue: mockGameEngine },
        { provide: EloService, useValue: mockEloService },
        { provide: APP_CONFIG, useValue: loadAppConfig(process.env) },
      ],
    }).compile();

    service = module.get<GameService>(GameService);

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initializeGame', () => {
    it('should_initialize_game_successfully_when_players_exist', async () => {
      // Arrange
      const matchId = 'match-123';
      const p1Id = 'player-1';
      const p2Id = 'player-2';

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' })
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' });

      // Act
      const room = await service.initializeGame(matchId, p1Id, p2Id);

      // Assert
      expect(room).toBeDefined();
      expect(room.matchId).toBe(matchId);
      expect(room.player1Id).toBe(p1Id);
      expect(room.player2Id).toBe(p2Id);
      expect(room.player1Username).toBe('user1');
      expect(room.player2Username).toBe('user2');
      expect(room.currentPlayer).toBe(0);
      expect(room.board).toEqual([4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
      expect(room.timer).toBeDefined();
    });

    it('should_throw_not_found_exception_if_a_player_does_not_exist', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.initializeGame('match-1', 'p1', 'p2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateMove', () => {
    const matchId = 'match-123';
    const p1Id = 'player-1';
    const p2Id = 'player-2';

    beforeEach(async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' })
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' });
      await service.initializeGame(matchId, p1Id, p2Id);
    });

    it('should_return_valid_for_correct_move', async () => {
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';

      const validation = await service.validateMove('socket-p1', {
        matchId,
        pitIndex: 2,
      });
      expect(validation.valid).toBe(true);
    });

    it('should_return_invalid_if_room_does_not_exist', async () => {
      const validation = await service.validateMove('socket-p1', {
        matchId: 'wrong-match',
        pitIndex: 2,
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Maç bulunamadı.');
    });

    it('should_return_invalid_if_player_not_in_match', async () => {
      const validation = await service.validateMove('socket-outsider', {
        matchId,
        pitIndex: 2,
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Bu maçta oyuncu değilsiniz.');
    });

    it('should_return_invalid_if_not_players_turn', async () => {
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';
      room.player2SocketId = 'socket-p2';
      room.currentPlayer = 1; // It is P2's turn

      const validation = await service.validateMove('socket-p1', {
        matchId,
        pitIndex: 2,
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Sıra sizde değil.');
    });

    it('should_return_invalid_if_pit_index_out_of_bounds_for_player', async () => {
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';

      // Player 1 can only move from index 0 to 5
      const validation = await service.validateMove('socket-p1', {
        matchId,
        pitIndex: 8,
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe(
        'Kendi bölgenizdeki bir kuyudan hamle yapmalısınız.',
      );
    });

    it('should_return_invalid_if_selected_pit_is_empty', async () => {
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';
      room.board[2] = 0; // Empty pit

      const validation = await service.validateMove('socket-p1', {
        matchId,
        pitIndex: 2,
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Seçilen kuyu boş.');
    });
  });

  describe('processMove', () => {
    const matchId = 'match-123';
    const p1Id = 'player-1';
    const p2Id = 'player-2';

    beforeEach(async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' })
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' });
      await service.initializeGame(matchId, p1Id, p2Id);
    });

    it('should_process_move_and_switch_turn_when_no_extra_turn', async () => {
      // Arrange
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';
      room.player2SocketId = 'socket-p2';

      mockGameEngine.processMove.mockReturnValue({
        newBoard: [4, 4, 0, 5, 5, 5, 1, 4, 4, 4, 4, 4, 4, 0],
        nextPlayer: 1,
        extraTurn: false,
        gameOver: false,
      });

      // Act
      const result = await service.processMove({ matchId, pitIndex: 2 });

      // Assert
      expect(result.nextPlayerId).toBe(p2Id);
      expect(result.gameOver).toBe(false);
      expect(mockPrisma.moveHistory.create).toHaveBeenCalled();
      expect(room.currentPlayer).toBe(1);
    });

    it('should_process_move_and_handle_game_over', async () => {
      // Arrange
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';
      room.player2SocketId = 'socket-p2';

      mockGameEngine.processMove.mockReturnValue({
        newBoard: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
        nextPlayer: 0,
        extraTurn: false,
        gameOver: true,
        winner: 0,
      });

      mockEloService.updateEloScores.mockResolvedValue({
        p1EloChange: 15,
        p2EloChange: -15,
      });

      // Act
      const result = await service.processMove({ matchId, pitIndex: 5 });

      // Assert
      expect(result.gameOver).toBe(true);
      expect(result.winnerId).toBe(p1Id);
      expect(result.p1EloChange).toBe(15);
      expect(result.p2EloChange).toBe(-15);
      expect(mockEloService.updateEloScores).toHaveBeenCalledWith(
        matchId,
        p1Id,
        p2Id,
        'p1_win',
      );
      expect(service.getRoom(matchId)).toBeUndefined(); // Room cleaned up
    });
  });

  describe('disconnect_and_reconnect', () => {
    const matchId = 'match-123';
    const p1Id = 'player-1';
    const p2Id = 'player-2';

    beforeEach(async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' })
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' });
      await service.initializeGame(matchId, p1Id, p2Id);
    });

    it('should_handle_player_disconnect_and_freeze_timer_if_on_turn', async () => {
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';

      // Act
      const result = await service.handlePlayerDisconnect('socket-p1');

      // Assert
      expect(result).toEqual({
        matchId,
        opponentSocketId: '',
        userId: p1Id,
      });
      expect(room.player1SocketId).toBe('');
      expect(room.timer).toBeNull(); // Timer frozen since currentPlayer is 0 (P1)
    });

    it('should_trigger_abandon_if_reconnect_window_expires', async () => {
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';
      mockEloService.updateEloScores.mockResolvedValue({
        p1EloChange: -15,
        p2EloChange: 15,
      });

      // Disconnect
      await service.handlePlayerDisconnect('socket-p1');

      // Act: Fast forward 60 seconds
      await jest.advanceTimersByTimeAsync(60000);

      // Assert
      expect(mockEloService.updateEloScores).toHaveBeenCalledWith(
        matchId,
        p1Id,
        p2Id,
        'p1_forfeit',
      );
      expect(service.getRoom(matchId)).toBeUndefined();
    });

    it('should_resume_timer_on_successful_reconnect', async () => {
      const room = service.getRoom(matchId)!;
      room.player1SocketId = 'socket-p1';

      // Disconnect
      await service.handlePlayerDisconnect('socket-p1');
      expect(room.timer).toBeNull();

      // Act: Reconnect
      await service.handleReconnect(p1Id, matchId, 'socket-p1-new');

      // Assert
      expect(room.player1SocketId).toBe('socket-p1-new');
      expect(room.timer).not.toBeNull();
    });
  });

  describe('turn_timeout', () => {
    const matchId = 'match-123';
    const p1Id = 'player-1';
    const p2Id = 'player-2';

    beforeEach(async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' })
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' });
      await service.initializeGame(matchId, p1Id, p2Id);
    });

    it('should_apply_forfeit_when_turn_timer_expires', async () => {
      mockEloService.updateEloScores.mockResolvedValue({
        p1EloChange: -15,
        p2EloChange: 15,
      });

      // Act: Fast forward to turn time limit
      const timeLimitMs = service.getTurnTimeLimit() * 1000;
      await jest.advanceTimersByTimeAsync(timeLimitMs);

      // Assert
      expect(mockEloService.updateEloScores).toHaveBeenCalledWith(
        matchId,
        p1Id,
        p2Id,
        'p1_forfeit',
      );
      expect(service.getRoom(matchId)).toBeUndefined();
    });
  });

  describe('rematch', () => {
    const matchId = 'match-finished-1';
    const p1Id = 'player-1';
    const p2Id = 'player-2';

    const setupFinishedMatch = async (): Promise<void> => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' })
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' });
      const room = await service.initializeGame(matchId, p1Id, p2Id);
      room.player1SocketId = 'socket-p1';
      room.player2SocketId = 'socket-p2';

      mockGameEngine.processMove.mockReturnValue({
        newBoard: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
        nextPlayer: 0,
        extraTurn: false,
        gameOver: true,
        winner: 0,
      });
      mockEloService.updateEloScores.mockResolvedValue({
        p1EloChange: 15,
        p2EloChange: -15,
      });

      await service.processMove({ matchId, pitIndex: 5 });
    };

    it('should_throw_bad_request_when_rematch_offered_for_unfinished_match', async () => {
      // Arrange
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' })
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' });
      await service.initializeGame('active-match-1', p1Id, p2Id);

      // Act & Assert
      await expect(
        service.offerRematch('active-match-1', p1Id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should_emit_rematch_declined_when_30s_offer_timeout_expires', async () => {
      // Arrange
      await setupFinishedMatch();
      mockPrisma.match.findUnique.mockResolvedValueOnce({
        id: matchId,
        status: 'FINISHED',
        isFriendly: false,
      });

      const mockEmit = jest.fn();
      const mockServer = {
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      };
      service.setServer(mockServer as unknown as Server);

      // Act
      const offerResult = await service.offerRematch(matchId, p1Id);
      expect(offerResult.status).toBe('offered');

      jest.advanceTimersByTime(30_000);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(matchId);
      expect(mockEmit).toHaveBeenCalledWith('game:rematch_declined', {
        matchId,
      });
      expect(service.getFinishedMatch(matchId)).toBeUndefined();
    });

    it('should_create_new_match_and_swap_roles_when_rematch_accepted', async () => {
      // Arrange
      await setupFinishedMatch();
      mockPrisma.match.findUnique
        .mockResolvedValueOnce({
          id: matchId,
          status: 'FINISHED',
          isFriendly: true,
        })
        .mockResolvedValueOnce({
          id: matchId,
          status: 'FINISHED',
          isFriendly: true,
        });
      mockPrisma.match.create.mockResolvedValueOnce({
        id: 'match-rematch-2',
        player1Id: p2Id,
        player2Id: p1Id,
        status: 'ACTIVE',
        isFriendly: true,
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' })
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' });

      await service.offerRematch(matchId, p1Id);

      // Act
      const response = await service.respondToRematch(matchId, p2Id, true);

      // Assert
      expect(response.status).toBe('started');
      if (response.status === 'started') {
        expect(response.oldMatchId).toBe(matchId);
        expect(response.newMatchId).toBe('match-rematch-2');
        expect(response.newRoom.player1Id).toBe(p2Id);
        expect(response.newRoom.player2Id).toBe(p1Id);
      }
      expect(mockPrisma.match.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.match.create).toHaveBeenCalledWith({
        data: {
          player1Id: p2Id,
          player2Id: p1Id,
          status: 'ACTIVE',
          isFriendly: true,
        },
      });
    });

    it('should_create_only_single_match_on_concurrent_double_accept', async () => {
      // Arrange
      await setupFinishedMatch();
      mockPrisma.match.findUnique
        .mockResolvedValueOnce({
          id: matchId,
          status: 'FINISHED',
          isFriendly: false,
        })
        .mockResolvedValueOnce({
          id: matchId,
          status: 'FINISHED',
          isFriendly: false,
        });
      mockPrisma.match.create.mockResolvedValue({
        id: 'match-rematch-single',
        player1Id: p2Id,
        player2Id: p1Id,
        status: 'ACTIVE',
        isFriendly: false,
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: p2Id, username: 'user2' })
        .mockResolvedValueOnce({ id: p1Id, username: 'user1' });

      await service.offerRematch(matchId, p1Id);

      // Act — Eşzamanlı çift kabul (race condition)
      const [res1, res2] = await Promise.all([
        service.respondToRematch(matchId, p2Id, true),
        service.respondToRematch(matchId, p2Id, true),
      ]);

      // Assert
      const startedCount = [res1, res2].filter(
        (r) => r.status === 'started',
      ).length;
      const ignoredCount = [res1, res2].filter(
        (r) => r.status === 'ignored',
      ).length;
      expect(startedCount).toBe(1);
      expect(ignoredCount).toBe(1);
      expect(mockPrisma.match.create).toHaveBeenCalledTimes(1);
    });

    it('should_cancel_pending_rematch_offer_when_player_disconnects', async () => {
      // Arrange
      await setupFinishedMatch();
      mockPrisma.match.findUnique.mockResolvedValueOnce({
        id: matchId,
        status: 'FINISHED',
        isFriendly: false,
      });

      const mockEmit = jest.fn();
      const mockServer = {
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      };
      service.setServer(mockServer as unknown as Server);

      await service.offerRematch(matchId, p1Id);

      // Act — Rakip oyuncu lobiye döner (disconnect)
      await service.handlePlayerDisconnect('socket-p2');

      // Assert
      expect(mockEmit).toHaveBeenCalledWith('game:rematch_declined', {
        matchId,
      });
      expect(service.getFinishedMatch(matchId)).toBeUndefined();
    });
  });
});
