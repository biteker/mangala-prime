import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { EloService } from '../elo/elo.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameEndReason } from '@mangala/shared';

describe('GameService', () => {
  let service: GameService;
  let gameEngine: GameEngineService;
  let eloService: EloService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
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
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    gameEngine = module.get<GameEngineService>(GameEngineService);
    eloService = module.get<EloService>(EloService);
    prisma = module.get<PrismaService>(PrismaService);

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
      await expect(service.initializeGame('match-1', 'p1', 'p2')).rejects.toThrow(NotFoundException);
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
      const room = service.getRoom(matchId);
      room.player1SocketId = 'socket-p1';

      const validation = await service.validateMove('socket-p1', { matchId, pitIndex: 2 });
      expect(validation.valid).toBe(true);
    });

    it('should_return_invalid_if_room_does_not_exist', async () => {
      const validation = await service.validateMove('socket-p1', { matchId: 'wrong-match', pitIndex: 2 });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Maç bulunamadı.');
    });

    it('should_return_invalid_if_player_not_in_match', async () => {
      const validation = await service.validateMove('socket-outsider', { matchId, pitIndex: 2 });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Bu maçta oyuncu değilsiniz.');
    });

    it('should_return_invalid_if_not_players_turn', async () => {
      const room = service.getRoom(matchId);
      room.player1SocketId = 'socket-p1';
      room.player2SocketId = 'socket-p2';
      room.currentPlayer = 1; // It is P2's turn

      const validation = await service.validateMove('socket-p1', { matchId, pitIndex: 2 });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Sıra sizde değil.');
    });

    it('should_return_invalid_if_pit_index_out_of_bounds_for_player', async () => {
      const room = service.getRoom(matchId);
      room.player1SocketId = 'socket-p1';

      // Player 1 can only move from index 0 to 5
      const validation = await service.validateMove('socket-p1', { matchId, pitIndex: 8 });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Kendi bölgenizdeki bir kuyudan hamle yapmalısınız.');
    });

    it('should_return_invalid_if_selected_pit_is_empty', async () => {
      const room = service.getRoom(matchId);
      room.player1SocketId = 'socket-p1';
      room.board[2] = 0; // Empty pit

      const validation = await service.validateMove('socket-p1', { matchId, pitIndex: 2 });
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
      const room = service.getRoom(matchId);
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
      const room = service.getRoom(matchId);
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
      expect(mockEloService.updateEloScores).toHaveBeenCalledWith(matchId, p1Id, p2Id, 'p1_win');
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
      const room = service.getRoom(matchId);
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
      const room = service.getRoom(matchId);
      room.player1SocketId = 'socket-p1';
      mockEloService.updateEloScores.mockResolvedValue({ p1EloChange: -15, p2EloChange: 15 });

      // Disconnect
      await service.handlePlayerDisconnect('socket-p1');

      // Act: Fast forward 60 seconds
      await jest.advanceTimersByTimeAsync(60000);

      // Assert
      expect(mockEloService.updateEloScores).toHaveBeenCalledWith(matchId, p1Id, p2Id, 'p1_forfeit');
      expect(service.getRoom(matchId)).toBeUndefined();
    });

    it('should_resume_timer_on_successful_reconnect', async () => {
      const room = service.getRoom(matchId);
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
      mockEloService.updateEloScores.mockResolvedValue({ p1EloChange: -15, p2EloChange: 15 });

      // Act: Fast forward 15 seconds
      await jest.advanceTimersByTimeAsync(15000);

      // Assert
      expect(mockEloService.updateEloScores).toHaveBeenCalledWith(matchId, p1Id, p2Id, 'p1_forfeit');
      expect(service.getRoom(matchId)).toBeUndefined();
    });
  });
});
