import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GameService } from '../game/game.service';
import { Server } from 'socket.io';

export interface OnlineUser {
  userId: string;
  username: string;
  socketId: string;
  ip: string;
  status: 'lobby' | 'playing';
}

export interface QueuePlayer {
  userId: string;
  username: string;
  socketId: string;
  ip: string;
  fingerprint?: string;
  joinedAt: number;
  timer: NodeJS.Timeout;
}

export interface ActiveInvite {
  inviterId: string;
  targetId: string;
  timer: NodeJS.Timeout;
}

export interface QueueJoinResult {
  success: boolean;
  error?: { code: string; message: string };
  matchDetails?: {
    matchId: string;
    player1: { userId: string; socketId: string; username: string };
    player2: { userId: string; socketId: string; username: string };
    isFriendly: boolean;
  };
}

@Injectable()
export class LobbyService {
  private readonly onlineUsers = new Map<string, OnlineUser>();
  private readonly queue = new Map<string, QueuePlayer>();
  private readonly invites = new Map<string, ActiveInvite>();
  private server: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  getOnlineUser(userId: string): OnlineUser | undefined {
    return this.onlineUsers.get(userId);
  }

  async addUser(userId: string, username: string, socketId: string, ip: string): Promise<void> {
    this.onlineUsers.set(userId, {
      userId,
      username,
      socketId,
      ip,
      status: 'lobby',
    });
  }

  async removeUser(socketId: string): Promise<string | null> {
    let disconnectedUserId: string | null = null;

    // Online listeden çıkar
    for (const [userId, user] of this.onlineUsers.entries()) {
      if (user.socketId === socketId) {
        disconnectedUserId = userId;
        this.onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      // Kuyruktan çıkar
      this.leaveQueue(disconnectedUserId);

      // İlgili tüm davetleri temizle
      for (const [key, invite] of this.invites.entries()) {
        if (invite.inviterId === disconnectedUserId || invite.targetId === disconnectedUserId) {
          clearTimeout(invite.timer);
          this.invites.delete(key);
        }
      }
    }

    return disconnectedUserId;
  }

  async joinQueue(userId: string, socketId: string, ip: string): Promise<QueueJoinResult> {
    const user = this.onlineUsers.get(userId);
    if (!user) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı online değil.' } };
    }

    if (user.status === 'playing') {
      return { success: false, error: { code: 'ALREADY_PLAYING', message: 'Şu anda oyundasınız.' } };
    }

    if (this.queue.has(userId)) {
      return { success: false, error: { code: 'ALREADY_IN_QUEUE', message: 'Zaten eşleşme sırasındasınız.' } };
    }

    // 1. Fingerprint kontrolü
    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (dbUser && dbUser.deviceFingerprint) {
        const duplicateInQueue = Array.from(this.queue.values()).some(
          (qp) => qp.fingerprint === dbUser.deviceFingerprint,
        );

        if (duplicateInQueue) {
          return {
            success: false,
            error: {
              code: 'DUPLICATE_FINGERPRINT',
              message: 'Aynı cihazdan iki farklı hesapla kuyruğa girilemez.',
            },
          };
        }

        // Kuyruğa ekle
        const timer = setTimeout(() => {
          this.handleQueueTimeout(userId);
        }, 120000);

        this.queue.set(userId, {
          userId,
          username: user.username,
          socketId,
          ip,
          fingerprint: dbUser.deviceFingerprint,
          joinedAt: Date.now(),
          timer,
        });
      } else {
        // Fingerprint yoksa da normal ekle
        const timer = setTimeout(() => {
          this.handleQueueTimeout(userId);
        }, 120000);

        this.queue.set(userId, {
          userId,
          username: user.username,
          socketId,
          ip,
          joinedAt: Date.now(),
          timer,
        });
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Sıraya katılırken veritabanı hatası oluştu.' },
      };
    }

    // 2. Eşleşme kontrolü yap
    const match = await this.checkAndMatch();
    if (match) {
      return {
        success: true,
        matchDetails: match,
      };
    }

    return { success: true };
  }

  leaveQueue(userId: string): void {
    const qp = this.queue.get(userId);
    if (qp) {
      clearTimeout(qp.timer);
      this.queue.delete(userId);
    }
  }

  async sendInvite(inviterId: string, targetId: string): Promise<boolean> {
    const inviter = this.onlineUsers.get(inviterId);
    const target = this.onlineUsers.get(targetId);

    if (!inviter || !target) {
      return false;
    }

    if (target.status === 'playing') {
      throw new BadRequestException({
        code: 'TARGET_PLAYING',
        message: 'Davet edilen oyuncu şu anda başka bir maçta.',
      });
    }

    const key = `${inviterId}:${targetId}`;
    if (this.invites.has(key)) {
      throw new BadRequestException({
        code: 'ALREADY_INVITED',
        message: 'Bu oyuncuya zaten bekleyen bir davetiniz var.',
      });
    }

    const timer = setTimeout(() => {
      this.handleInviteTimeout(inviterId, targetId);
    }, 30000);

    this.invites.set(key, {
      inviterId,
      targetId,
      timer,
    });

    return true;
  }

  async handleInviteResponse(
    inviterId: string,
    targetId: string,
    accepted: boolean,
  ): Promise<{
    matchId?: string;
    player1?: OnlineUser;
    player2?: OnlineUser;
  } | null> {
    const key = `${inviterId}:${targetId}`;
    const invite = this.invites.get(key);
    if (!invite) {
      return null;
    }

    clearTimeout(invite.timer);
    this.invites.delete(key);

    if (!accepted) {
      return {};
    }

    const p1 = this.onlineUsers.get(inviterId);
    const p2 = this.onlineUsers.get(targetId);

    if (!p1 || !p2 || p1.status === 'playing' || p2.status === 'playing') {
      throw new BadRequestException({
        code: 'INVITE_EXPIRED',
        message: 'Davet geçerliliğini yitirdi veya oyuncular oyuna girdi.',
      });
    }

    const isFriendly = p1.ip === p2.ip;

    try {
      const match = await this.prisma.match.create({
        data: {
          player1Id: inviterId,
          player2Id: targetId,
          status: 'ACTIVE',
          isFriendly,
        },
      });

      // Lobi durumlarını güncelle
      p1.status = 'playing';
      p2.status = 'playing';

      await this.gameService.initializeGame(match.id, inviterId, targetId);

      return {
        matchId: match.id,
        player1: p1,
        player2: p2,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        code: 'DATABASE_ERROR',
        message: 'Maç oluşturulurken veritabanı hatası oluştu.',
      });
    }
  }

  async getPlayerElo(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      return user?.eloScore ?? 1000;
    } catch (err) {
      return 1000;
    }
  }

  // --- Matchmaking FIFO Core ---

  private async checkAndMatch(): Promise<{
    matchId: string;
    player1: { userId: string; socketId: string; username: string };
    player2: { userId: string; socketId: string; username: string };
    isFriendly: boolean;
  } | null> {
    if (this.queue.size < 2) {
      return null;
    }

    const sortedQueue = Array.from(this.queue.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    const p1 = sortedQueue[0];
    const p2 = sortedQueue[1];

    this.leaveQueue(p1.userId);
    this.leaveQueue(p2.userId);

    const isFriendly = p1.ip === p2.ip;

    try {
      const match = await this.prisma.match.create({
        data: {
          player1Id: p1.userId,
          player2Id: p2.userId,
          status: 'ACTIVE',
          isFriendly,
        },
      });

      // Online status güncellemesi
      const user1 = this.onlineUsers.get(p1.userId);
      const user2 = this.onlineUsers.get(p2.userId);
      if (user1) user1.status = 'playing';
      if (user2) user2.status = 'playing';

      await this.gameService.initializeGame(match.id, p1.userId, p2.userId);

      return {
        matchId: match.id,
        player1: { userId: p1.userId, socketId: p1.socketId, username: p1.username },
        player2: { userId: p2.userId, socketId: p2.socketId, username: p2.username },
        isFriendly,
      };
    } catch (dbError) {
      // Hata durumunda tekrar kuyruğa alınabilir veya drop edilir
      throw new InternalServerErrorException({
        code: 'DATABASE_ERROR',
        message: 'Maç kaydı oluşturulurken veritabanı hatası oluştu.',
      });
    }
  }

  private handleQueueTimeout(userId: string): void {
    this.queue.delete(userId);
    if (this.server) {
      const user = this.onlineUsers.get(userId);
      if (user) {
        this.server.to(user.socketId).emit('lobby:queue_timeout', {
          message: 'Eşleşme sırası zaman aşımına uğradı (120 saniye).',
        });
      }
    }
  }

  private handleInviteTimeout(inviterId: string, targetId: string): void {
    const key = `${inviterId}:${targetId}`;
    if (this.invites.has(key)) {
      this.invites.delete(key);

      if (this.server) {
        const target = this.onlineUsers.get(targetId);
        const inviter = this.onlineUsers.get(inviterId);

        if (target) {
          this.server.to(target.socketId).emit('lobby:invite_timeout', {
            inviterUserId: inviterId,
          });
        }

        if (inviter) {
          this.server.to(inviter.socketId).emit('lobby:error', {
            error: {
              code: 'INVITE_TIMEOUT',
              message: 'Gönderdiğiniz oyun daveti zaman aşımına uğradı (30 saniye).',
            },
          });
        }
      }
    }
  }
}
