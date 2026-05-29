import { Test, TestingModule } from '@nestjs/testing';
import { EloService, calculateExpectedScore, getKFactor, calculateDelta } from './elo.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('EloService - Saf Matematiksel Fonksiyonlar (Unit)', () => {
  it('calculateExpectedScore - esit ELO durumunda beklenen skor 0.5 olmalı', () => {
    expect(calculateExpectedScore(1000, 1000)).toBeCloseTo(0.5);
  });

  it('calculateExpectedScore - yuksek ELO durumunda beklenen skor > 0.5 olmalı', () => {
    expect(calculateExpectedScore(1400, 1000)).toBeGreaterThan(0.5);
    expect(calculateExpectedScore(1000, 1400)).toBeLessThan(0.5);
  });

  it('getKFactor - limit gecisleri dogru calismali', () => {
    // 30 mactan az ise K = 40 (ELO ne olursa olsun)
    expect(getKFactor(1000, 10)).toBe(40);
    expect(getKFactor(2100, 10)).toBe(40);

    // ELO < 1200 ise K = 40 (mac ne olursa olsun)
    expect(getKFactor(1100, 50)).toBe(40);

    // 30+ mac VE 1200 <= ELO < 2000 ise K = 20
    expect(getKFactor(1500, 50)).toBe(20);

    // 30+ mac VE ELO >= 2000 ise K = 10
    expect(getKFactor(2100, 50)).toBe(10);
  });

  it('calculateDelta - galibiyet/yenilgi/beraberlik durumlarinda yuvarlanmis degerler donmeli', () => {
    // Esit ELO'larda galibiyet (K=40): 40 * (1 - 0.5) = 20
    expect(calculateDelta(1000, 1000, 'WIN', 10)).toBe(20);
    // Esit ELO'larda yenilgi (K=40): 40 * (0 - 0.5) = -20
    expect(calculateDelta(1000, 1000, 'LOSS', 10)).toBe(-20);
    // Esit ELO'larda beraberlik (K=40): 40 * (0.5 - 0.5) = 0
    expect(calculateDelta(1000, 1000, 'DRAW', 10)).toBe(0);
  });
});

describe('EloService - Veritabanı Entegrasyon Testleri (Mocked)', () => {
  let service: EloService;
  let prismaMock: Record<string, Record<string, jest.Mock> | jest.Mock>;

  beforeEach(async () => {
    prismaMock = {
      match: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EloService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<EloService>(EloService);
  });

  it('updateEloScores - normal galibiyet durumunda ELO guncellenmeli', async () => {
    const matchMock = prismaMock.match as Record<string, jest.Mock>;
    const userMock = prismaMock.user as Record<string, jest.Mock>;

    matchMock.findUnique.mockResolvedValue({
      id: 'match1',
      isFriendly: false,
    });

    userMock.findUnique
      .mockResolvedValueOnce({
        id: 'p1',
        eloScore: 1000,
        matchesAsP1: [],
        matchesAsP2: Array(10).fill({}),
      })
      .mockResolvedValueOnce({
        id: 'p2',
        eloScore: 1000,
        matchesAsP1: Array(10).fill({}),
        matchesAsP2: [],
      });

    const result = await service.updateEloScores('match1', 'p1', 'p2', 'p1_win');

    expect(result.p1EloChange).toBe(20);
    expect(result.p2EloChange).toBe(-20);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('updateEloScores - hukmen (forfeit) yenilgi durumunda ELO +-15 guncellenmeli', async () => {
    const matchMock = prismaMock.match as Record<string, jest.Mock>;
    const userMock = prismaMock.user as Record<string, jest.Mock>;

    matchMock.findUnique.mockResolvedValue({
      id: 'match1',
      isFriendly: false,
    });

    userMock.findUnique
      .mockResolvedValueOnce({
        id: 'p1',
        eloScore: 1000,
        matchesAsP1: [],
        matchesAsP2: [],
      })
      .mockResolvedValueOnce({
        id: 'p2',
        eloScore: 1000,
        matchesAsP1: [],
        matchesAsP2: [],
      });

    const result = await service.updateEloScores('match1', 'p1', 'p2', 'p1_forfeit');

    expect(result.p1EloChange).toBe(-15);
    expect(result.p2EloChange).toBe(15);
  });

  it('updateEloScores - friendly macta ELO degismemeli (0 olmalı)', async () => {
    const matchMock = prismaMock.match as Record<string, jest.Mock>;
    const userMock = prismaMock.user as Record<string, jest.Mock>;

    matchMock.findUnique.mockResolvedValue({
      id: 'match1',
      isFriendly: true,
    });

    userMock.findUnique
      .mockResolvedValueOnce({
        id: 'p1',
        eloScore: 1000,
        matchesAsP1: [],
        matchesAsP2: [],
      })
      .mockResolvedValueOnce({
        id: 'p2',
        eloScore: 1000,
        matchesAsP1: [],
        matchesAsP2: [],
      });

    const result = await service.updateEloScores('match1', 'p1', 'p2', 'p1_win');

    expect(result.p1EloChange).toBe(0);
    expect(result.p2EloChange).toBe(0);
  });

  it('updateEloScores - ELO alt siniri (100) korunmali', async () => {
    const matchMock = prismaMock.match as Record<string, jest.Mock>;
    const userMock = prismaMock.user as Record<string, jest.Mock>;

    matchMock.findUnique.mockResolvedValue({
      id: 'match1',
      isFriendly: false,
    });

    userMock.findUnique
      .mockResolvedValueOnce({
        id: 'p1',
        eloScore: 110,
        matchesAsP1: [],
        matchesAsP2: Array(10).fill({}),
      })
      .mockResolvedValueOnce({
        id: 'p2',
        eloScore: 110,
        matchesAsP1: Array(10).fill({}),
        matchesAsP2: [],
      });

    const result = await service.updateEloScores('match1', 'p1', 'p2', 'p2_win');

    expect(result.p1EloChange).toBe(-10);
  });
});
