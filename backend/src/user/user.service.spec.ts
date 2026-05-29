import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    match: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should_get_user_profile_successfully', async () => {
      // Arrange
      const userId = 'user-uuid';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        username: 'player1',
        eloScore: 1100,
        wins: 10,
        losses: 5,
      });
      mockPrisma.match.count.mockResolvedValue(15);

      // Act
      const result = await service.getUserProfile(userId);

      // Assert
      expect(result).toEqual({
        id: userId,
        username: 'player1',
        elo: 1100,
        totalMatches: 15,
        wins: 10,
        losses: 5,
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockPrisma.match.count).toHaveBeenCalledWith({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: { in: ['FINISHED', 'ABANDONED'] },
        },
      });
    });

    it('should_throw_not_found_exception_if_profile_user_not_found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserProfile('nonexistent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLeaderboard', () => {
    it('should_get_leaderboard_successfully', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', username: 'top1', eloScore: 2200, wins: 40 },
        { id: 'u2', username: 'top2', eloScore: 2000, wins: 30 },
      ]);
      mockPrisma.match.count.mockResolvedValue(50);

      // Act
      const result = await service.getLeaderboard();

      // Assert
      expect(result).toEqual([
        { rank: 1, username: 'top1', elo: 2200, wins: 40, totalMatches: 50 },
        { rank: 2, username: 'top2', elo: 2000, wins: 30, totalMatches: 50 },
      ]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { eloScore: 'desc' },
        take: 50,
      });
    });
  });

  describe('getUserPublicProfile', () => {
    it('should_get_user_public_profile_successfully_with_match_history', async () => {
      // Arrange
      const username = 'testuser';
      const userId = 'u-test';
      const mockUser = { id: userId, username, eloScore: 1500 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const mockMatches = [
        {
          id: 'match-1',
          player1Id: userId,
          player2Id: 'u-other',
          winnerId: userId,
          p1EloChange: 15,
          p2EloChange: -15,
          createdAt: new Date('2026-05-30T00:00:00.000Z'),
          player1: mockUser,
          player2: { id: 'u-other', username: 'opponent1' },
        },
        {
          id: 'match-2',
          player1Id: 'u-other',
          player2Id: userId,
          winnerId: 'u-other',
          p1EloChange: 12,
          p2EloChange: -12,
          createdAt: new Date('2026-05-29T00:00:00.000Z'),
          player1: { id: 'u-other', username: 'opponent2' },
          player2: mockUser,
        },
        {
          id: 'match-3',
          player1Id: userId,
          player2Id: 'u-other',
          winnerId: null,
          p1EloChange: 0,
          p2EloChange: 0,
          createdAt: new Date('2026-05-28T00:00:00.000Z'),
          player1: mockUser,
          player2: { id: 'u-other', username: 'opponent3' },
        },
      ];
      mockPrisma.match.findMany.mockResolvedValue(mockMatches);

      // Act
      const result = await service.getUserPublicProfile(username);

      // Assert
      expect(result).toEqual({
        username,
        elo: 1500,
        matchHistory: [
          {
            id: 'match-1',
            opponent: 'opponent1',
            result: 'WIN',
            eloChange: 15,
            date: '2026-05-30T00:00:00.000Z',
          },
          {
            id: 'match-2',
            opponent: 'opponent2',
            result: 'LOSS',
            eloChange: -12,
            date: '2026-05-29T00:00:00.000Z',
          },
          {
            id: 'match-3',
            opponent: 'opponent3',
            result: 'DRAW',
            eloChange: 0,
            date: '2026-05-28T00:00:00.000Z',
          },
        ],
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { username } });
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: { in: ['FINISHED', 'ABANDONED'] },
        },
        include: { player1: true, player2: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_throw_not_found_exception_if_public_profile_user_not_found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserPublicProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
