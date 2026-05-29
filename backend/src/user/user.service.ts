import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserProfileResponse, LeaderboardEntry, UserPublicProfileResponse } from '@mangala/shared';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Kullanıcı bulunamadı.',
        });
      }

      const totalMatches = await this.prisma.match.count({
        where: {
          OR: [
            { player1Id: userId },
            { player2Id: userId },
          ],
          status: {
            in: ['FINISHED', 'ABANDONED'],
          },
        },
      });

      return {
        id: user.id,
        username: user.username,
        elo: user.eloScore,
        totalMatches,
        wins: user.wins,
        losses: user.losses,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Kullanıcı profili alınırken veritabanı hatası oluştu.',
      });
    }
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const users = await this.prisma.user.findMany({
        orderBy: { eloScore: 'desc' },
        take: 50,
      });

      const leaderboardEntries = await Promise.all(
        users.map(async (user, index) => {
          const totalMatches = await this.prisma.match.count({
            where: {
              OR: [
                { player1Id: user.id },
                { player2Id: user.id },
              ],
              status: {
                in: ['FINISHED', 'ABANDONED'],
              },
            },
          });
          return {
            rank: index + 1,
            username: user.username,
            elo: user.eloScore,
            wins: user.wins,
            totalMatches,
          };
        })
      );

      return leaderboardEntries;
    } catch (error) {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Liderlik tablosu alınırken veritabanı hatası oluştu.',
      });
    }
  }

  async getUserPublicProfile(username: string): Promise<UserPublicProfileResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Kullanıcı bulunamadı.',
        });
      }

      const matches = await this.prisma.match.findMany({
        where: {
          OR: [
            { player1Id: user.id },
            { player2Id: user.id },
          ],
          status: {
            in: ['FINISHED', 'ABANDONED'],
          },
        },
        include: {
          player1: true,
          player2: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const matchHistory = matches.map((match) => {
        const isP1 = match.player1Id === user.id;
        const opponent = isP1 ? match.player2.username : match.player1.username;

        let result: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW';
        if (match.winnerId === user.id) {
          result = 'WIN';
        } else if (match.winnerId) {
          result = 'LOSS';
        }

        const eloChange = isP1 ? (match.p1EloChange ?? 0) : (match.p2EloChange ?? 0);

        return {
          id: match.id,
          opponent,
          result,
          eloChange,
          date: match.createdAt.toISOString(),
        };
      });

      return {
        username: user.username,
        elo: user.eloScore,
        matchHistory,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Kullanıcı profili aranırken veritabanı hatası oluştu.',
      });
    }
  }
}
