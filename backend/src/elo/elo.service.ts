import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// Saf ELO hesaplama fonksiyonları (dış bağımlılık içermez)
export function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

export function getKFactor(elo: number, totalMatches: number): number {
  if (totalMatches < 30 || elo < 1200) {
    return 40;
  }
  if (elo >= 2000) {
    return 10;
  }
  return 20;
}

export function calculateDelta(
  playerElo: number,
  opponentElo: number,
  outcome: 'WIN' | 'LOSS' | 'DRAW',
  totalMatches: number,
): number {
  const expected = calculateExpectedScore(playerElo, opponentElo);
  const kFactor = getKFactor(playerElo, totalMatches);
  
  let actual = 0.5;
  if (outcome === 'WIN') {
    actual = 1.0;
  } else if (outcome === 'LOSS') {
    actual = 0.0;
  }

  return Math.round(kFactor * (actual - expected));
}

@Injectable()
export class EloService {
  constructor(private readonly prisma: PrismaService) {}

  async updateEloScores(
    matchId: string,
    player1Id: string,
    player2Id: string,
    result: 'p1_win' | 'p2_win' | 'draw' | 'p1_forfeit' | 'p2_forfeit',
  ): Promise<{ p1EloChange: number; p2EloChange: number }> {
    try {
      // 1. Maç kaydını ve oyuncuları bul
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Maç bulunamadı.',
        });
      }

      const p1 = await this.prisma.user.findUnique({
        where: { id: player1Id },
        include: {
          matchesAsP1: true,
          matchesAsP2: true,
        },
      });

      const p2 = await this.prisma.user.findUnique({
        where: { id: player2Id },
        include: {
          matchesAsP1: true,
          matchesAsP2: true,
        },
      });

      if (!p1 || !p2) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Oyuncu profili bulunamadı.',
        });
      }

      // Toplam maç sayıları
      const p1TotalMatches = p1.matchesAsP1.length + p1.matchesAsP2.length;
      const p2TotalMatches = p2.matchesAsP1.length + p2.matchesAsP2.length;

      let p1Delta = 0;
      let p2Delta = 0;
      let winnerId: string | null = null;

      // Maç sonucuna göre ELO değişim hesabı
      if (match.isFriendly) {
        // Friendly (aynı IP) maçlarda ELO değişmez
        p1Delta = 0;
        p2Delta = 0;
        if (result === 'p1_win' || result === 'p1_forfeit') winnerId = player1Id;
        else if (result === 'p2_win' || result === 'p2_forfeit') winnerId = player2Id;
      } else if (result === 'p1_forfeit') {
        p1Delta = -15;
        p2Delta = 15;
        winnerId = player2Id; // P1 çekildi/hükmen, P2 kazandı
      } else if (result === 'p2_forfeit') {
        p1Delta = 15;
        p2Delta = -15;
        winnerId = player1Id; // P2 çekildi/hükmen, P1 kazandı
      } else {
        // Normal maç sonu
        if (result === 'p1_win') {
          p1Delta = calculateDelta(p1.eloScore, p2.eloScore, 'WIN', p1TotalMatches);
          p2Delta = calculateDelta(p2.eloScore, p1.eloScore, 'LOSS', p2TotalMatches);
          winnerId = player1Id;
        } else if (result === 'p2_win') {
          p1Delta = calculateDelta(p1.eloScore, p2.eloScore, 'LOSS', p1TotalMatches);
          p2Delta = calculateDelta(p2.eloScore, p1.eloScore, 'WIN', p2TotalMatches);
          winnerId = player2Id;
        } else if (result === 'draw') {
          p1Delta = calculateDelta(p1.eloScore, p2.eloScore, 'DRAW', p1TotalMatches);
          p2Delta = calculateDelta(p2.eloScore, p1.eloScore, 'DRAW', p2TotalMatches);
          winnerId = null;
        }
      }

      // ELO Alt Sınırı (100) kontrolü
      const p1NewElo = Math.max(100, p1.eloScore + p1Delta);
      const p2NewElo = Math.max(100, p2.eloScore + p2Delta);

      // Sınırlama nedeniyle oluşan net değişimler
      const p1NetDelta = p1NewElo - p1.eloScore;
      const p2NetDelta = p2NewElo - p2.eloScore;

      // İstatistik güncellemeleri
      let p1WinsInc = 0;
      let p1LossesInc = 0;
      let p2WinsInc = 0;
      let p2LossesInc = 0;

      if (result === 'p1_win' || result === 'p2_forfeit') {
        p1WinsInc = 1;
        p2LossesInc = 1;
      } else if (result === 'p2_win' || result === 'p1_forfeit') {
        p1LossesInc = 1;
        p2WinsInc = 1;
      }

      // 2. Veritabanı güncellemelerini single transaction içinde gerçekleştir
      await this.prisma.$transaction([
        this.prisma.match.update({
          where: { id: matchId },
          data: {
            status: result.includes('forfeit') ? 'ABANDONED' : 'FINISHED',
            winnerId,
            p1EloChange: p1NetDelta,
            p2EloChange: p2NetDelta,
          },
        }),
        this.prisma.user.update({
          where: { id: player1Id },
          data: {
            eloScore: p1NewElo,
            wins: { increment: p1WinsInc },
            losses: { increment: p1LossesInc },
          },
        }),
        this.prisma.user.update({
          where: { id: player2Id },
          data: {
            eloScore: p2NewElo,
            wins: { increment: p2WinsInc },
            losses: { increment: p2LossesInc },
          },
        }),
      ]);

      return {
        p1EloChange: p1NetDelta,
        p2EloChange: p2NetDelta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'ELO derecelendirme güncellemesi sırasında veritabanı hatası oluştu.',
      });
    }
  }
}
