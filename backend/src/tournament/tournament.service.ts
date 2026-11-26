import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Server } from 'socket.io';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { GameService } from '../game/game.service';
import {
  generateSwissRound,
  calculateStandings,
  type TournamentSummary,
  type TournamentDetailResponse,
  type TournamentParticipantView,
  type TournamentPairingView,
  type TournamentMatchAssignedPayload,
  type TournamentStatusChangedPayload,
  type MyActiveTournamentStatusResponse,
  type PairingResult,
  type UserRole,
} from '@mangala/shared';
import {
  CreateTournamentDto,
  JoinTournamentDto,
  OverridePairingResult,
} from './dto/tournament.dto';

const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateJoinCode(): string {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += JOIN_CODE_CHARS[bytes[i] % JOIN_CODE_CHARS.length];
  }
  return code;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

@Injectable()
export class TournamentService implements OnModuleInit {
  private server: Server | null = null;
  private readonly userSockets = new Map<string, Set<string>>();
  private onPlayersLockedCallback: ((userIds: string[]) => void) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
  ) {}

  onModuleInit(): void {
    this.gameService.registerOnMatchFinished(
      async (matchId: string, winnerId?: string): Promise<void> => {
        await this.onMatchFinished(matchId, winnerId);
      },
    );
  }

  registerOnPlayersLocked(callback: (userIds: string[]) => void): void {
    this.onPlayersLockedCallback = callback;
  }

  private notifyPlayersLocked(userIds: string[]): void {
    if (this.onPlayersLockedCallback && userIds.length > 0) {
      this.onPlayersLockedCallback(userIds);
    }
  }

  private emitStatusChangedToUsers(
    userIds: string[],
    payload: TournamentStatusChangedPayload,
  ): void {
    for (const userId of userIds) {
      this.emitToUser(userId, 'tournament:status_changed', payload);
    }
  }

  private emptyActiveStatus(): MyActiveTournamentStatusResponse {
    return {
      hasActiveTournamentMatch: false,
      isLockedInTournament: false,
      activeTournamentId: null,
      activeTournamentName: null,
      activeTournamentStatus: null,
      currentRound: null,
      totalRounds: null,
      activeMatchId: null,
      activeSetNumber: null,
      setsPerMatch: null,
      opponentUsername: null,
    };
  }

  setServer(server: Server): void {
    this.server = server;
  }

  registerUserSocket(userId: string, socketId: string): void {
    let set = this.userSockets.get(userId);
    if (!set) {
      set = new Set<string>();
      this.userSockets.set(userId, set);
    }
    set.add(socketId);
  }

  unregisterUserSocket(userId: string, socketId: string): void {
    const set = this.userSockets.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
      this.userSockets.delete(userId);
    }
  }

  private emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  private broadcastTournamentUpdate(
    tournamentId: string,
    status: string,
    currentRound: number,
  ): void {
    if (!this.server) return;
    this.server.to(`tournament:${tournamentId}`).emit('tournament:updated', {
      tournamentId,
      status,
      currentRound,
    });
  }

  private ensureManagerAccess(
    tournamentCreatorId: string,
    userId: string,
    role: UserRole,
  ): void {
    if (role === 'ADMIN') return;
    if (role === 'TEACHER' && tournamentCreatorId === userId) return;
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Bu turnuvayı yönetme yetkiniz bulunmamaktadır.',
    });
  }

  async createTournament(
    dto: CreateTournamentDto,
    creatorId: string,
  ): Promise<TournamentSummary> {
    try {
      let joinCode = generateJoinCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await this.prisma.tournament.findUnique({
          where: { joinCode },
          select: { id: true },
        });
        if (!exists) break;
        joinCode = generateJoinCode();
      }

      const created = await this.prisma.tournament.create({
        data: {
          name: dto.name.trim(),
          joinCode,
          schoolName: dto.schoolName?.trim() || null,
          format: dto.format ?? 'SWISS',
          status: 'REGISTRATION',
          totalRounds: dto.totalRounds,
          currentRound: 0,
          setsPerMatch: dto.setsPerMatch,
          turnTimeLimitSecs: dto.turnTimeLimitSecs ?? 59,
          affectsGlobalElo: dto.affectsGlobalElo,
          createdById: creatorId,
        },
        include: {
          createdBy: { select: { username: true } },
          _count: { select: { participants: true } },
        },
      });

      return {
        id: created.id,
        name: created.name,
        joinCode: created.joinCode,
        schoolName: created.schoolName,
        format: created.format,
        status: created.status,
        totalRounds: created.totalRounds,
        currentRound: created.currentRound,
        setsPerMatch: created.setsPerMatch,
        turnTimeLimitSecs: created.turnTimeLimitSecs,
        affectsGlobalElo: created.affectsGlobalElo,
        participantCount: created._count.participants,
        createdById: created.createdById,
        createdByUsername: created.createdBy.username,
        createdAt: created.createdAt.toISOString(),
      };
    } catch {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Turnuva oluşturulurken veritabanı hatası oluştu.',
      });
    }
  }

  async listTournaments(schoolName?: string): Promise<TournamentSummary[]> {
    try {
      const query = schoolName?.trim();
      const rows = await this.prisma.tournament.findMany({
        where: query
          ? { schoolName: { contains: query, mode: 'insensitive' } }
          : undefined,
        include: {
          createdBy: { select: { username: true } },
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        joinCode: row.joinCode,
        schoolName: row.schoolName,
        format: row.format,
        status: row.status,
        totalRounds: row.totalRounds,
        currentRound: row.currentRound,
        setsPerMatch: row.setsPerMatch,
        turnTimeLimitSecs: row.turnTimeLimitSecs,
        affectsGlobalElo: row.affectsGlobalElo,
        participantCount: row._count.participants,
        createdById: row.createdById,
        createdByUsername: row.createdBy.username,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Turnuva listesi alınırken veritabanı hatası oluştu.',
      });
    }
  }

  async getTournamentDetail(
    tournamentId: string,
    requesterId: string,
  ): Promise<TournamentDetailResponse> {
    try {
      const t = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          createdBy: { select: { username: true } },
          participants: {
            include: {
              user: { select: { id: true, username: true, eloScore: true } },
            },
          },
          pairings: {
            include: {
              player1: { select: { id: true, username: true } },
              player2: { select: { id: true, username: true } },
              matches: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { id: true, status: true },
              },
            },
            orderBy: [{ round: 'desc' }, { tableNumber: 'asc' }],
          },
        },
      });

      if (!t) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Turnuva bulunamadı.',
        });
      }

      // Detect shared IPs among participants for referee warning badge (Phase 2 / T-23)
      const ipCounts = new Map<string, number>();
      for (const p of t.participants) {
        if (p.lastIp) {
          ipCounts.set(p.lastIp, (ipCounts.get(p.lastIp) ?? 0) + 1);
        }
      }

      const participants: TournamentParticipantView[] = t.participants
        .map((p) => ({
          id: p.id,
          userId: p.userId,
          username: p.user.username,
          elo: p.user.eloScore,
          classLabel: p.classLabel,
          points: p.points,
          buchholz: p.buchholz,
          wins: p.wins,
          draws: p.draws,
          losses: p.losses,
          checkedIn: p.checkedIn,
          disqualified: p.disqualified,
          sharedNetworkWarning: Boolean(
            p.lastIp && (ipCounts.get(p.lastIp) ?? 0) > 1,
          ),
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.elo - a.elo;
        });

      let myActiveMatchId: string | null = null;
      const pairings: TournamentPairingView[] = t.pairings.map((pair) => {
        const latestMatch = pair.matches[0];
        const activeMatchId =
          latestMatch && latestMatch.status === 'ACTIVE'
            ? latestMatch.id
            : null;
        if (
          activeMatchId &&
          (pair.player1Id === requesterId || pair.player2Id === requesterId)
        ) {
          myActiveMatchId = activeMatchId;
        }
        return {
          id: pair.id,
          round: pair.round,
          tableNumber: pair.tableNumber,
          player1Id: pair.player1Id,
          player1Username: pair.player1.username,
          player2Id: pair.player2Id,
          player2Username: pair.player2?.username ?? null,
          activeMatchId,
          setNumber: pair.setNumber,
          p1SetWins: pair.p1SetWins,
          p2SetWins: pair.p2SetWins,
          result: pair.result,
        };
      });

      return {
        id: t.id,
        name: t.name,
        joinCode: t.joinCode,
        schoolName: t.schoolName,
        format: t.format,
        status: t.status,
        totalRounds: t.totalRounds,
        currentRound: t.currentRound,
        setsPerMatch: t.setsPerMatch,
        turnTimeLimitSecs: t.turnTimeLimitSecs,
        affectsGlobalElo: t.affectsGlobalElo,
        participantCount: participants.length,
        createdById: t.createdById,
        createdByUsername: t.createdBy.username,
        createdAt: t.createdAt.toISOString(),
        participants,
        pairings,
        myActiveMatchId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Turnuva detayları alınırken veritabanı hatası oluştu.',
      });
    }
  }

  async joinTournament(
    dto: JoinTournamentDto,
    userId: string,
    clientIp: string,
  ): Promise<{ tournamentId: string }> {
    try {
      const normalizedCode = dto.joinCode.trim().toUpperCase();
      const tournament = await this.prisma.tournament.findUnique({
        where: { joinCode: normalizedCode },
      });

      if (!tournament) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Bu katılım koduna ait turnuva bulunamadı.',
        });
      }

      if (
        tournament.status !== 'REGISTRATION' &&
        tournament.status !== 'CHECK_IN'
      ) {
        throw new BadRequestException({
          code: 'TOURNAMENT_CLOSED',
          message: 'Bu turnuva artık yeni katılımcı kabul etmiyor.',
        });
      }

      await this.prisma.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId,
          },
        },
        update: {
          classLabel: dto.classLabel?.trim() || undefined,
          lastIp: clientIp,
          checkedIn: tournament.status === 'CHECK_IN' ? true : undefined,
        },
        create: {
          tournamentId: tournament.id,
          userId,
          classLabel: dto.classLabel?.trim() || null,
          lastIp: clientIp,
          checkedIn: tournament.status === 'CHECK_IN',
        },
      });

      this.broadcastTournamentUpdate(
        tournament.id,
        tournament.status,
        tournament.currentRound,
      );

      return { tournamentId: tournament.id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Turnuvaya katılırken veritabanı hatası oluştu.',
      });
    }
  }

  async openCheckIn(
    tournamentId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ status: string }> {
    try {
      const t = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          participants: {
            where: { disqualified: false },
            select: { userId: true },
          },
        },
      });
      if (!t) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Turnuva bulunamadı.',
        });
      }
      this.ensureManagerAccess(t.createdById, requesterId, requesterRole);

      if (t.status !== 'REGISTRATION') {
        throw new BadRequestException({
          code: 'INVALID_STATE',
          message: 'Yoklama yalnızca kayıt aşamasındaki turnuvada açılabilir.',
        });
      }

      await this.prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'CHECK_IN' },
      });

      const participantIds = (t.participants ?? []).map((p) => p.userId);
      this.notifyPlayersLocked(participantIds);
      this.emitStatusChangedToUsers(participantIds, {
        tournamentId,
        status: 'CHECK_IN',
        currentRound: t.currentRound,
      });

      this.broadcastTournamentUpdate(tournamentId, 'CHECK_IN', t.currentRound);
      return { status: 'CHECK_IN' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Yoklama açılırken veritabanı hatası oluştu.',
      });
    }
  }

  async checkInParticipant(
    tournamentId: string,
    userId: string,
    clientIp: string,
  ): Promise<{ checkedIn: boolean }> {
    try {
      const participant = await this.prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: { tournamentId, userId },
        },
      });
      if (!participant) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Bu turnuvaya kayıtlı değilsiniz.',
        });
      }

      await this.prisma.tournamentParticipant.update({
        where: { id: participant.id },
        data: { checkedIn: true, lastIp: clientIp },
      });

      const t = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { status: true, currentRound: true },
      });
      if (t) {
        this.broadcastTournamentUpdate(tournamentId, t.status, t.currentRound);
      }

      return { checkedIn: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Yoklama verilirken veritabanı hatası oluştu.',
      });
    }
  }

  async startNextRound(
    tournamentId: string,
    requesterId: string,
    requesterRole: UserRole,
    onlyCheckedIn?: boolean,
  ): Promise<{ round: number; pairingsCreated: number }> {
    try {
      const t = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, eloScore: true } },
            },
          },
          pairings: true,
        },
      });

      if (!t) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Turnuva bulunamadı.',
        });
      }
      this.ensureManagerAccess(t.createdById, requesterId, requesterRole);

      if (t.status === 'FINISHED' || t.status === 'CANCELLED') {
        throw new BadRequestException({
          code: 'TOURNAMENT_FINISHED',
          message: 'Tamamlanmış turnuvada yeni tur başlatılamaz.',
        });
      }

      const pendingInCurrent = t.pairings.some(
        (p) => p.round === t.currentRound && p.result === 'PENDING',
      );
      if (pendingInCurrent) {
        throw new BadRequestException({
          code: 'ROUND_IN_PROGRESS',
          message:
            'Mevcut turdaki tüm masalar sonuçlanmadan yeni tur başlatılamaz.',
        });
      }

      const nextRound = t.currentRound + 1;
      if (nextRound > t.totalRounds) {
        await this.prisma.tournament.update({
          where: { id: tournamentId },
          data: { status: 'FINISHED', finishedAt: new Date() },
        });
        this.broadcastTournamentUpdate(
          tournamentId,
          'FINISHED',
          t.currentRound,
        );
        const allUserIds = (t.participants ?? []).map((p) => p.userId);
        this.emitStatusChangedToUsers(allUserIds, {
          tournamentId,
          status: 'FINISHED',
          currentRound: t.currentRound,
        });
        return { round: t.currentRound, pairingsCreated: 0 };
      }

      const enforceCheckIn = onlyCheckedIn ?? t.status === 'CHECK_IN';
      const eligibleParticipants = t.participants.filter(
        (p) => !p.disqualified && (!enforceCheckIn || p.checkedIn),
      );

      if (eligibleParticipants.length < 2) {
        throw new BadRequestException({
          code: 'NOT_ENOUGH_PLAYERS',
          message: 'Tur başlatmak için en az 2 hazır oyuncu gereklidir.',
        });
      }

      const eligibleIds = eligibleParticipants.map((p) => p.userId);
      this.notifyPlayersLocked(eligibleIds);

      const generated = generateSwissRound(
        eligibleParticipants.map((p) => ({
          userId: p.userId,
          elo: p.user.eloScore,
          points: p.points,
          disqualified: p.disqualified,
        })),
        t.pairings.map((p) => ({
          player1Id: p.player1Id,
          player2Id: p.player2Id,
          result: p.result,
        })),
      );

      const usernameById = new Map(
        t.participants.map((p) => [p.userId, p.user.username]),
      );

      await this.prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'IN_PROGRESS',
          currentRound: nextRound,
          startedAt: t.startedAt ?? new Date(),
        },
      });

      for (const pair of generated) {
        const createdPairing = await this.prisma.tournamentPairing.create({
          data: {
            tournamentId,
            round: nextRound,
            tableNumber: pair.tableNumber,
            player1Id: pair.player1Id,
            player2Id: pair.player2Id,
            setNumber: 1,
            result: pair.isBye ? 'BYE' : 'PENDING',
          },
        });

        if (!pair.isBye && pair.player2Id) {
          const match = await this.prisma.match.create({
            data: {
              player1Id: pair.player1Id,
              player2Id: pair.player2Id,
              status: 'ACTIVE',
              isFriendly: !t.affectsGlobalElo,
              tournamentId,
              tournamentPairingId: createdPairing.id,
            },
          });

          await this.gameService.initializeGame(
            match.id,
            pair.player1Id,
            pair.player2Id,
            {
              tournamentId,
              setNumber: 1,
              setsPerMatch: t.setsPerMatch,
            },
          );

          const p1Payload: TournamentMatchAssignedPayload = {
            tournamentId,
            pairingId: createdPairing.id,
            matchId: match.id,
            round: nextRound,
            tableNumber: pair.tableNumber,
            setNumber: 1,
            setsPerMatch: t.setsPerMatch,
            opponentUsername: usernameById.get(pair.player2Id) ?? 'Rakip',
          };
          const p2Payload: TournamentMatchAssignedPayload = {
            ...p1Payload,
            opponentUsername: usernameById.get(pair.player1Id) ?? 'Rakip',
          };

          this.emitToUser(
            pair.player1Id,
            'tournament:match_assigned',
            p1Payload,
          );
          this.emitToUser(
            pair.player2Id,
            'tournament:match_assigned',
            p2Payload,
          );
        }
      }

      await this.recalculateAndPersistStandings(tournamentId);
      this.broadcastTournamentUpdate(tournamentId, 'IN_PROGRESS', nextRound);
      this.emitStatusChangedToUsers(eligibleIds, {
        tournamentId,
        status: 'IN_PROGRESS',
        currentRound: nextRound,
      });

      return { round: nextRound, pairingsCreated: generated.length };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Tur başlatılırken veritabanı hatası oluştu.',
      });
    }
  }

  async onMatchFinished(matchId: string, winnerId?: string): Promise<void> {
    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          tournament: true,
          tournamentPairing: true,
        },
      });

      if (!match?.tournament || !match.tournamentPairing) {
        return;
      }

      const pairing = match.tournamentPairing;
      const tournament = match.tournament;

      if (pairing.result !== 'PENDING') {
        return;
      }

      let p1SetWins = pairing.p1SetWins;
      let p2SetWins = pairing.p2SetWins;

      if (winnerId === pairing.player1Id) {
        p1SetWins += 1;
      } else if (winnerId === pairing.player2Id) {
        p2SetWins += 1;
      }

      // If 2-set match and Set 1 just finished, auto-start Set 2 with swapped P1/P2
      if (
        tournament.setsPerMatch === 2 &&
        pairing.setNumber === 1 &&
        pairing.player2Id
      ) {
        await this.prisma.tournamentPairing.update({
          where: { id: pairing.id },
          data: {
            setNumber: 2,
            p1SetWins,
            p2SetWins,
          },
        });

        // Swap P1 and P2 for Set 2 so first-mover advantage is fair
        const set2Match = await this.prisma.match.create({
          data: {
            player1Id: pairing.player2Id,
            player2Id: pairing.player1Id,
            status: 'ACTIVE',
            isFriendly: !tournament.affectsGlobalElo,
            tournamentId: tournament.id,
            tournamentPairingId: pairing.id,
          },
        });

        await this.gameService.initializeGame(
          set2Match.id,
          pairing.player2Id,
          pairing.player1Id,
          {
            tournamentId: tournament.id,
            setNumber: 2,
            setsPerMatch: 2,
          },
        );

        this.gameService.emitTournamentNextSet?.({
          oldMatchId: matchId,
          newMatchId: set2Match.id,
          tournamentId: tournament.id,
          setNumber: 2,
          setsPerMatch: 2,
        });

        const users = await this.prisma.user.findMany({
          where: { id: { in: [pairing.player1Id, pairing.player2Id] } },
          select: { id: true, username: true },
        });
        const nameMap = new Map(users.map((u) => [u.id, u.username]));

        const p1Payload: TournamentMatchAssignedPayload = {
          tournamentId: tournament.id,
          pairingId: pairing.id,
          matchId: set2Match.id,
          round: pairing.round,
          tableNumber: pairing.tableNumber,
          setNumber: 2,
          setsPerMatch: 2,
          opponentUsername: nameMap.get(pairing.player2Id) ?? 'Rakip',
        };
        const p2Payload: TournamentMatchAssignedPayload = {
          ...p1Payload,
          opponentUsername: nameMap.get(pairing.player1Id) ?? 'Rakip',
        };

        this.emitToUser(
          pairing.player1Id,
          'tournament:match_assigned',
          p1Payload,
        );
        this.emitToUser(
          pairing.player2Id,
          'tournament:match_assigned',
          p2Payload,
        );
        this.broadcastTournamentUpdate(
          tournament.id,
          tournament.status,
          tournament.currentRound,
        );
        return;
      }

      // Finalize pairing result
      let finalResult: PairingResult = 'DRAW';
      if (p1SetWins > p2SetWins) {
        finalResult = 'P1_WIN';
      } else if (p2SetWins > p1SetWins) {
        finalResult = 'P2_WIN';
      }

      await this.prisma.tournamentPairing.update({
        where: { id: pairing.id },
        data: {
          p1SetWins,
          p2SetWins,
          result: finalResult,
        },
      });

      await this.recalculateAndPersistStandings(tournament.id);
      const finalStatus = await this.checkTournamentAutoFinish(tournament.id);
      const matchUserIds = [
        pairing.player1Id,
        ...(pairing.player2Id ? [pairing.player2Id] : []),
      ];
      this.emitStatusChangedToUsers(matchUserIds, {
        tournamentId: tournament.id,
        status: finalStatus ?? tournament.status,
        currentRound: tournament.currentRound,
      });
    } catch {
      // Prevent tournament hook error from breaking match cleanup
    }
  }

  async overridePairingResult(
    tournamentId: string,
    pairingId: string,
    result: OverridePairingResult,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ result: PairingResult }> {
    try {
      const t = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!t) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Turnuva bulunamadı.',
        });
      }
      this.ensureManagerAccess(t.createdById, requesterId, requesterRole);

      const pairing = await this.prisma.tournamentPairing.findUnique({
        where: { id: pairingId },
        include: { matches: { where: { status: 'ACTIVE' } } },
      });
      if (!pairing || pairing.tournamentId !== tournamentId) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Eşleşme bulunamadı.',
        });
      }

      // Close any active game rooms for this pairing
      for (const activeMatch of pairing.matches) {
        this.gameService.cleanUpRoom(activeMatch.id);
        await this.prisma.match.update({
          where: { id: activeMatch.id },
          data: { status: 'ABANDONED' },
        });
      }

      await this.prisma.tournamentPairing.update({
        where: { id: pairingId },
        data: { result },
      });

      await this.recalculateAndPersistStandings(tournamentId);
      const finalStatus = await this.checkTournamentAutoFinish(tournamentId);
      const pairingUserIds = [
        ...(pairing.player1Id ? [pairing.player1Id] : []),
        ...(pairing.player2Id ? [pairing.player2Id] : []),
      ];
      this.emitStatusChangedToUsers(pairingUserIds, {
        tournamentId,
        status: finalStatus ?? t.status,
        currentRound: t.currentRound,
      });

      return { result };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Hakem sonucu kaydedilirken veritabanı hatası oluştu.',
      });
    }
  }

  async setParticipantDisqualified(
    tournamentId: string,
    targetUserId: string,
    disqualified: boolean,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ disqualified: boolean }> {
    try {
      const t = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!t) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Turnuva bulunamadı.',
        });
      }
      this.ensureManagerAccess(t.createdById, requesterId, requesterRole);

      const participant = await this.prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: { tournamentId, userId: targetUserId },
        },
      });
      if (!participant) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Katılımcı bulunamadı.',
        });
      }

      await this.prisma.tournamentParticipant.update({
        where: { id: participant.id },
        data: { disqualified },
      });

      this.broadcastTournamentUpdate(tournamentId, t.status, t.currentRound);
      this.emitStatusChangedToUsers([targetUserId], {
        tournamentId,
        status: t.status,
        currentRound: t.currentRound,
      });
      return { disqualified };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Diskalifiye durumu güncellenirken veritabanı hatası oluştu.',
      });
    }
  }

  async hasActiveTournamentMatch(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const count = await this.prisma.match.count({
        where: {
          status: 'ACTIVE',
          tournamentId: { not: null },
          OR: [{ player1Id: userId }, { player2Id: userId }],
        },
      });
      return count > 0;
    } catch {
      return false;
    }
  }

  async isUserLockedInTournament(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const activeMatchCount = await this.prisma.match.count({
        where: {
          status: 'ACTIVE',
          tournamentId: { not: null },
          OR: [{ player1Id: userId }, { player2Id: userId }],
        },
      });
      if (activeMatchCount > 0) {
        return true;
      }

      const activeParticipantCount =
        await this.prisma.tournamentParticipant.count({
          where: {
            userId,
            disqualified: false,
            tournament: {
              status: { in: ['CHECK_IN', 'IN_PROGRESS'] },
            },
          },
        });
      return activeParticipantCount > 0;
    } catch {
      return false;
    }
  }

  async getMyActiveStatus(
    userId: string,
  ): Promise<MyActiveTournamentStatusResponse> {
    if (!userId) {
      return this.emptyActiveStatus();
    }

    try {
      const activeMatch = await this.prisma.match.findFirst({
        where: {
          status: 'ACTIVE',
          tournamentId: { not: null },
          OR: [{ player1Id: userId }, { player2Id: userId }],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true,
              currentRound: true,
              totalRounds: true,
              setsPerMatch: true,
            },
          },
          tournamentPairing: {
            select: { setNumber: true },
          },
          player1: { select: { username: true } },
          player2: { select: { username: true } },
        },
      });

      if (activeMatch?.tournament) {
        const opponentUsername =
          activeMatch.player1Id === userId
            ? activeMatch.player2.username
            : activeMatch.player1.username;

        return {
          hasActiveTournamentMatch: true,
          isLockedInTournament: true,
          activeTournamentId: activeMatch.tournament.id,
          activeTournamentName: activeMatch.tournament.name,
          activeTournamentStatus: activeMatch.tournament.status,
          currentRound: activeMatch.tournament.currentRound,
          totalRounds: activeMatch.tournament.totalRounds,
          activeMatchId: activeMatch.id,
          activeSetNumber: activeMatch.tournamentPairing?.setNumber ?? 1,
          setsPerMatch: activeMatch.tournament.setsPerMatch,
          opponentUsername,
        };
      }

      const activeEntry = await this.prisma.tournamentParticipant.findFirst({
        where: {
          userId,
          disqualified: false,
          tournament: {
            status: { in: ['CHECK_IN', 'IN_PROGRESS'] },
          },
        },
        orderBy: { tournament: { updatedAt: 'desc' } },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true,
              currentRound: true,
              totalRounds: true,
              setsPerMatch: true,
            },
          },
        },
      });

      if (activeEntry?.tournament) {
        return {
          hasActiveTournamentMatch: false,
          isLockedInTournament: true,
          activeTournamentId: activeEntry.tournament.id,
          activeTournamentName: activeEntry.tournament.name,
          activeTournamentStatus: activeEntry.tournament.status,
          currentRound: activeEntry.tournament.currentRound,
          totalRounds: activeEntry.tournament.totalRounds,
          activeMatchId: null,
          activeSetNumber: null,
          setsPerMatch: activeEntry.tournament.setsPerMatch,
          opponentUsername: null,
        };
      }

      return this.emptyActiveStatus();
    } catch {
      return this.emptyActiveStatus();
    }
  }

  async exportStandingsCsv(tournamentId: string): Promise<string> {
    const detail = await this.getTournamentDetail(tournamentId, '');
    const header = [
      'Sira',
      'Kullanici Adi',
      'Sinif',
      'Puan',
      'Buchholz',
      'Galibiyet',
      'Beraberlik',
      'Maglubiyet',
      'ELO',
      'Durum',
    ].join(',');

    const lines = detail.participants.map((p, idx) =>
      [
        idx + 1,
        escapeCsvCell(p.username),
        escapeCsvCell(p.classLabel ?? ''),
        p.points,
        p.buchholz,
        p.wins,
        p.draws,
        p.losses,
        p.elo,
        p.disqualified ? 'Diskalifiye' : 'Aktif',
      ].join(','),
    );

    return [header, ...lines].join('\n');
  }

  private async recalculateAndPersistStandings(
    tournamentId: string,
  ): Promise<void> {
    const t = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: { user: { select: { eloScore: true } } },
        },
        pairings: true,
      },
    });
    if (!t) return;

    const standings = calculateStandings(
      t.participants.map((p) => ({
        userId: p.userId,
        elo: p.user.eloScore,
        points: p.points,
        disqualified: p.disqualified,
      })),
      t.pairings.map((p) => ({
        player1Id: p.player1Id,
        player2Id: p.player2Id,
        result: p.result,
      })),
    );

    await this.prisma.$transaction(
      standings.map((s) =>
        this.prisma.tournamentParticipant.update({
          where: {
            tournamentId_userId: { tournamentId, userId: s.userId },
          },
          data: {
            points: s.points,
            buchholz: s.buchholz,
            wins: s.wins,
            draws: s.draws,
            losses: s.losses,
          },
        }),
      ),
    );
  }

  private async checkTournamentAutoFinish(
    tournamentId: string,
  ): Promise<string | undefined> {
    const t = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        pairings: true,
        participants: { select: { userId: true } },
      },
    });
    if (!t) return undefined;

    const pendingInCurrent = (t.pairings ?? []).some(
      (p) => p.round === t.currentRound && p.result === 'PENDING',
    );

    if (!pendingInCurrent && t.currentRound >= t.totalRounds) {
      await this.prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'FINISHED', finishedAt: new Date() },
      });
      this.broadcastTournamentUpdate(tournamentId, 'FINISHED', t.currentRound);
      const allUserIds = (t.participants ?? []).map((p) => p.userId);
      this.emitStatusChangedToUsers(allUserIds, {
        tournamentId,
        status: 'FINISHED',
        currentRound: t.currentRound,
      });
      return 'FINISHED';
    } else {
      this.broadcastTournamentUpdate(tournamentId, t.status, t.currentRound);
      return t.status;
    }
  }
}
