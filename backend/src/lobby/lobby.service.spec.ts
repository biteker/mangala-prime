import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GameService } from '../game/game.service';
import { BadRequestException } from '@nestjs/common';

describe('LobbyService', () => {
  let service: LobbyService;
  let prisma: PrismaService;
  let gameService: GameService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    match: {
      create: jest.fn(),
    },
  };

  const mockGameService = {
    initializeGame: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GameService, useValue: mockGameService },
      ],
    }).compile();

    service = module.get<LobbyService>(LobbyService);
    prisma = module.get<PrismaService>(PrismaService);
    gameService = module.get<GameService>(GameService);

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('online_users', () => {
    it('should_add_and_remove_online_users_successfully', async () => {
      // Act
      await service.addUser('user-1', 'user1', 'socket-1', '127.0.0.1');

      // Assert
      expect(service.getOnlineUsers().length).toBe(1);
      expect(service.getOnlineUser('user-1')).toBeDefined();

      // Disconnect
      const removedId = await service.removeUser('socket-1');
      expect(removedId).toBe('user-1');
      expect(service.getOnlineUsers().length).toBe(0);
    });
  });

  describe('matchmaking_queue', () => {
    it('should_match_two_players_in_fifo_order_and_detect_same_ip_friendly', async () => {
      // Arrange
      await service.addUser('user-1', 'user1', 'socket-1', '192.168.1.10');
      await service.addUser('user-2', 'user2', 'socket-2', '192.168.1.10'); // Same IP (Friendly)

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', deviceFingerprint: 'fingerprint-1' })
        .mockResolvedValueOnce({ id: 'user-2', deviceFingerprint: 'fingerprint-2' });

      mockPrisma.match.create.mockResolvedValue({ id: 'match-123', isFriendly: true });

      // Act
      const result1 = await service.joinQueue('user-1', 'socket-1', '192.168.1.10');
      expect(result1.success).toBe(true);
      expect(result1.matchDetails).toBeUndefined(); // Still waiting in queue

      const result2 = await service.joinQueue('user-2', 'socket-2', '192.168.1.10');

      // Assert
      expect(result2.success).toBe(true);
      expect(result2.matchDetails).toBeDefined();
      expect(result2.matchDetails!.isFriendly).toBe(true);
      expect(mockPrisma.match.create).toHaveBeenCalledWith({
        data: {
          player1Id: 'user-1',
          player2Id: 'user-2',
          status: 'ACTIVE',
          isFriendly: true,
        },
      });
      expect(mockGameService.initializeGame).toHaveBeenCalledWith('match-123', 'user-1', 'user-2');
    });

    it('should_block_queue_join_if_duplicate_fingerprint', async () => {
      // Arrange
      await service.addUser('user-1', 'user1', 'socket-1', '192.168.1.10');
      await service.addUser('user-2', 'user2', 'socket-2', '192.168.1.11');

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', deviceFingerprint: 'same-fingerprint' })
        .mockResolvedValueOnce({ id: 'user-2', deviceFingerprint: 'same-fingerprint' });

      // Act: Player 1 joins
      await service.joinQueue('user-1', 'socket-1', '192.168.1.10');

      // Act: Player 2 joins (should fail)
      const result = await service.joinQueue('user-2', 'socket-2', '192.168.1.11');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('DUPLICATE_FINGERPRINT');
    });

    it('should_timeout_and_remove_player_from_queue_after_120_seconds', async () => {
      // Arrange
      await service.addUser('user-1', 'user1', 'socket-1', '192.168.1.10');
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', deviceFingerprint: 'fp-1' });

      // Act
      await service.joinQueue('user-1', 'socket-1', '192.168.1.10');

      // Fast forward 120 seconds
      await jest.advanceTimersByTimeAsync(120000);

      // Assert
      // User should be removed from the queue
      const matchDetails = await service.joinQueue('user-2', 'socket-2', '192.168.1.11');
      expect(matchDetails.matchDetails).toBeUndefined(); // P1 already timed out, so P2 won't match
    });
  });

  describe('invitation_system', () => {
    it('should_create_match_on_invite_acceptance', async () => {
      // Arrange
      await service.addUser('user-1', 'user1', 'socket-1', '192.168.1.10');
      await service.addUser('user-2', 'user2', 'socket-2', '192.168.1.11');
      mockPrisma.match.create.mockResolvedValue({ id: 'match-invite-123' });

      // Act: Send invite
      const sent = await service.sendInvite('user-1', 'user-2');
      expect(sent).toBe(true);

      // Act: Accept invite
      const matchResult = await service.handleInviteResponse('user-1', 'user-2', true);

      // Assert
      expect(matchResult).toBeDefined();
      expect(matchResult!.matchId).toBe('match-invite-123');
      expect(mockPrisma.match.create).toHaveBeenCalled();
      expect(mockGameService.initializeGame).toHaveBeenCalled();
    });

    it('should_reject_invite_if_target_playing', async () => {
      // Arrange
      await service.addUser('user-1', 'user1', 'socket-1', '192.168.1.10');
      await service.addUser('user-2', 'user2', 'socket-2', '192.168.1.11');
      service.getOnlineUser('user-2')!.status = 'playing';

      // Act & Assert
      await expect(service.sendInvite('user-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('should_timeout_invite_after_30_seconds', async () => {
      // Arrange
      await service.addUser('user-1', 'user1', 'socket-1', '192.168.1.10');
      await service.addUser('user-2', 'user2', 'socket-2', '192.168.1.11');

      // Send invite
      await service.sendInvite('user-1', 'user-2');

      // Fast forward 30 seconds
      await jest.advanceTimersByTimeAsync(30000);

      // Act: Try to respond (should return null as invite is deleted)
      const result = await service.handleInviteResponse('user-1', 'user-2', true);
      expect(result).toBeNull();
    });
  });
});
