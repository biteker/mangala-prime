import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GameService } from '../game/game.service';
import { OverridePairingResult } from './dto/tournament.dto';

describe('TournamentService', () => {
  let service: TournamentService;

  const mockPrisma = {
    tournament: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tournamentParticipant: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tournamentPairing: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    match: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };

  const mockGameService = {
    registerOnMatchFinished: jest.fn(),
    initializeGame: jest.fn(),
    cleanUpRoom: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GameService, useValue: mockGameService },
      ],
    }).compile();

    service = module.get<TournamentService>(TournamentService);
    jest.clearAllMocks();
  });

  it('should_create_tournament_with_unique_join_code', async () => {
    const now = new Date();
    mockPrisma.tournament.findUnique.mockResolvedValue(null);
    mockPrisma.tournament.create.mockResolvedValue({
      id: 't-1',
      name: 'Okul Sonbahar Turnuvası',
      joinCode: 'ABC234',
      schoolName: 'Atatürk Ortaokulu',
      format: 'SWISS',
      status: 'REGISTRATION',
      totalRounds: 5,
      currentRound: 0,
      setsPerMatch: 2,
      turnTimeLimitSecs: 59,
      affectsGlobalElo: true,
      createdById: 'teacher-1',
      createdBy: { username: 'ogretmen' },
      _count: { participants: 0 },
      createdAt: now,
    });

    const result = await service.createTournament(
      {
        name: 'Okul Sonbahar Turnuvası',
        schoolName: 'Atatürk Ortaokulu',
        totalRounds: 5,
        setsPerMatch: 2,
        affectsGlobalElo: true,
      },
      'teacher-1',
    );

    expect(result.id).toBe('t-1');
    expect(result.setsPerMatch).toBe(2);
    expect(result.affectsGlobalElo).toBe(true);
  });

  it('should_reject_start_round_from_unrelated_teacher', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 't-1',
      createdById: 'teacher-1',
      status: 'REGISTRATION',
      currentRound: 0,
      totalRounds: 5,
      participants: [],
      pairings: [],
    });

    await expect(
      service.startNextRound('t-1', 'teacher-2', 'TEACHER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should_reject_start_round_when_fewer_than_2_checked_in_players_in_check_in_mode', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 't-1',
      createdById: 'teacher-1',
      status: 'CHECK_IN',
      currentRound: 0,
      totalRounds: 5,
      participants: [
        {
          userId: 'u1',
          points: 0,
          checkedIn: true,
          disqualified: false,
          user: { id: 'u1', username: 's1', eloScore: 1000 },
        },
        {
          userId: 'u2',
          points: 0,
          checkedIn: false,
          disqualified: false,
          user: { id: 'u2', username: 's2', eloScore: 1000 },
        },
      ],
      pairings: [],
    });

    await expect(
      service.startNextRound('t-1', 'teacher-1', 'TEACHER'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_auto_start_set_2_with_swapped_roles_when_set_1_finishes_in_2_set_tournament', async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: 'match-set-1',
      tournament: {
        id: 't-1',
        status: 'IN_PROGRESS',
        currentRound: 1,
        setsPerMatch: 2,
        affectsGlobalElo: true,
      },
      tournamentPairing: {
        id: 'pair-1',
        round: 1,
        tableNumber: 1,
        player1Id: 'u1',
        player2Id: 'u2',
        setNumber: 1,
        p1SetWins: 0,
        p2SetWins: 0,
        result: 'PENDING',
      },
    });
    mockPrisma.tournamentPairing.update.mockResolvedValue({});
    mockPrisma.match.create.mockResolvedValue({ id: 'match-set-2' });
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', username: 'ali' },
      { id: 'u2', username: 'veli' },
    ]);

    await service.onMatchFinished('match-set-1', 'u1');

    // Set 2 swaps player1Id and player2Id
    expect(mockPrisma.match.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        player1Id: 'u2',
        player2Id: 'u1',
        isFriendly: false,
        tournamentId: 't-1',
        tournamentPairingId: 'pair-1',
      }) as Record<string, unknown>,
    });
    expect(mockGameService.initializeGame).toHaveBeenCalledWith(
      'match-set-2',
      'u2',
      'u1',
    );
  });

  it('should_allow_referee_override_and_clean_up_active_match', async () => {
    mockPrisma.tournament.findUnique
      .mockResolvedValueOnce({
        id: 't-1',
        createdById: 'teacher-1',
        status: 'IN_PROGRESS',
        currentRound: 1,
        totalRounds: 3,
      })
      .mockResolvedValueOnce({
        id: 't-1',
        participants: [],
        pairings: [],
      })
      .mockResolvedValueOnce({
        id: 't-1',
        status: 'IN_PROGRESS',
        currentRound: 1,
        totalRounds: 3,
        pairings: [],
      });

    mockPrisma.tournamentPairing.findUnique.mockResolvedValue({
      id: 'pair-1',
      tournamentId: 't-1',
      matches: [{ id: 'active-m-1' }],
    });
    mockPrisma.match.update.mockResolvedValue({});
    mockPrisma.tournamentPairing.update.mockResolvedValue({});

    const res = await service.overridePairingResult(
      't-1',
      'pair-1',
      OverridePairingResult.NO_SHOW_P2,
      'teacher-1',
      'TEACHER',
    );

    expect(res.result).toBe('NO_SHOW_P2');
    expect(mockGameService.cleanUpRoom).toHaveBeenCalledWith('active-m-1');
  });
});
