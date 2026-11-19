import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { APP_CONFIG, type AppConfig } from '../common/config/app-config';
import type {
  TrustedSchoolIpItem,
  AdminUserItem,
  AdminSettingsResponse,
} from '@mangala/shared';
import {
  CreateSchoolIpDto,
  UpdateSchoolIpDto,
  UpdateUserRoleDto,
  UpdateAdminSettingsDto,
} from './dto/admin.dto';

const SETTING_SCHOOL_DAILY_PAIR_LIMIT = 'schoolDailyRankedPairLimit';
const SETTING_DEFAULT_TURN_LIMIT = 'defaultTurnTimeLimitSecs';
const DEFAULT_SCHOOL_DAILY_PAIR_LIMIT = 3;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async isTrustedSchoolIp(ipAddress: string): Promise<boolean> {
    if (!ipAddress) {
      return false;
    }
    try {
      const record = await this.prisma.trustedSchoolIp.findFirst({
        where: {
          ipAddress,
          isActive: true,
        },
        select: { id: true },
      });
      return Boolean(record);
    } catch {
      return false;
    }
  }

  async getSchoolDailyRankedPairLimit(): Promise<number> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: SETTING_SCHOOL_DAILY_PAIR_LIMIT },
      });
      if (!setting) {
        return DEFAULT_SCHOOL_DAILY_PAIR_LIMIT;
      }
      const parsed = Number(setting.value);
      return Number.isInteger(parsed) && parsed >= 1
        ? parsed
        : DEFAULT_SCHOOL_DAILY_PAIR_LIMIT;
    } catch {
      return DEFAULT_SCHOOL_DAILY_PAIR_LIMIT;
    }
  }

  async listSchoolIps(): Promise<TrustedSchoolIpItem[]> {
    try {
      const rows = await this.prisma.trustedSchoolIp.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row) => ({
        id: row.id,
        schoolName: row.schoolName,
        ipAddress: row.ipAddress,
        isActive: row.isActive,
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Okul IP listesi alınırken veritabanı hatası oluştu.',
      });
    }
  }

  async createSchoolIp(
    dto: CreateSchoolIpDto,
    createdById: string,
  ): Promise<TrustedSchoolIpItem> {
    try {
      const existing = await this.prisma.trustedSchoolIp.findUnique({
        where: { ipAddress: dto.ipAddress.trim() },
      });
      if (existing) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Bu IP adresi zaten kayıtlı.',
        });
      }

      const created = await this.prisma.trustedSchoolIp.create({
        data: {
          schoolName: dto.schoolName.trim(),
          ipAddress: dto.ipAddress.trim(),
          notes: dto.notes?.trim() || null,
          isActive: true,
          createdById,
        },
      });

      return {
        id: created.id,
        schoolName: created.schoolName,
        ipAddress: created.ipAddress,
        isActive: created.isActive,
        notes: created.notes,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Okul IP kaydı oluşturulurken veritabanı hatası oluştu.',
      });
    }
  }

  async updateSchoolIp(
    id: string,
    dto: UpdateSchoolIpDto,
  ): Promise<TrustedSchoolIpItem> {
    try {
      const existing = await this.prisma.trustedSchoolIp.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Okul IP kaydı bulunamadı.',
        });
      }

      const updated = await this.prisma.trustedSchoolIp.update({
        where: { id },
        data: {
          ...(dto.schoolName !== undefined
            ? { schoolName: dto.schoolName.trim() }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.notes !== undefined
            ? { notes: dto.notes.trim() || null }
            : {}),
        },
      });

      return {
        id: updated.id,
        schoolName: updated.schoolName,
        ipAddress: updated.ipAddress,
        isActive: updated.isActive,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Okul IP kaydı güncellenirken veritabanı hatası oluştu.',
      });
    }
  }

  async deleteSchoolIp(id: string): Promise<{ deleted: boolean }> {
    try {
      const existing = await this.prisma.trustedSchoolIp.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Okul IP kaydı bulunamadı.',
        });
      }

      await this.prisma.trustedSchoolIp.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Okul IP kaydı silinirken veritabanı hatası oluştu.',
      });
    }
  }

  async listUsers(search?: string): Promise<AdminUserItem[]> {
    try {
      const query = search?.trim();
      const users = await this.prisma.user.findMany({
        where: query
          ? {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { schoolName: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      });

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        schoolName: user.schoolName,
        elo: user.eloScore,
        wins: user.wins,
        losses: user.losses,
        createdAt: user.createdAt.toISOString(),
      }));
    } catch {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Kullanıcı listesi alınırken veritabanı hatası oluştu.',
      });
    }
  }

  async updateUserRole(
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<AdminUserItem> {
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

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: dto.role,
          ...(dto.schoolName !== undefined
            ? { schoolName: dto.schoolName.trim() || null }
            : {}),
        },
      });

      return {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        schoolName: updated.schoolName,
        elo: updated.eloScore,
        wins: updated.wins,
        losses: updated.losses,
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Kullanıcı rolü güncellenirken veritabanı hatası oluştu.',
      });
    }
  }

  async resetUserPassword(
    userId: string,
    newPassword: string,
  ): Promise<{ reset: boolean }> {
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

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          refreshToken: null,
        },
      });

      return { reset: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Şifre sıfırlanırken veritabanı hatası oluştu.',
      });
    }
  }

  async getSettings(): Promise<AdminSettingsResponse> {
    try {
      const rows = await this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: [SETTING_SCHOOL_DAILY_PAIR_LIMIT, SETTING_DEFAULT_TURN_LIMIT],
          },
        },
      });

      const map = new Map(rows.map((r) => [r.key, r.value]));
      const rawLimit = Number(map.get(SETTING_SCHOOL_DAILY_PAIR_LIMIT));
      const rawTurn = Number(map.get(SETTING_DEFAULT_TURN_LIMIT));

      return {
        schoolDailyRankedPairLimit:
          Number.isInteger(rawLimit) && rawLimit >= 1
            ? rawLimit
            : DEFAULT_SCHOOL_DAILY_PAIR_LIMIT,
        defaultTurnTimeLimitSecs:
          Number.isInteger(rawTurn) && rawTurn >= 10 && rawTurn <= 300
            ? rawTurn
            : this.config.turnTimeLimitSecs,
      };
    } catch {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Sistem ayarları alınırken veritabanı hatası oluştu.',
      });
    }
  }

  async updateSettings(
    dto: UpdateAdminSettingsDto,
  ): Promise<AdminSettingsResponse> {
    try {
      const ops: Promise<unknown>[] = [];

      if (dto.schoolDailyRankedPairLimit !== undefined) {
        ops.push(
          this.prisma.systemSetting.upsert({
            where: { key: SETTING_SCHOOL_DAILY_PAIR_LIMIT },
            update: { value: String(dto.schoolDailyRankedPairLimit) },
            create: {
              key: SETTING_SCHOOL_DAILY_PAIR_LIMIT,
              value: String(dto.schoolDailyRankedPairLimit),
            },
          }),
        );
      }

      if (dto.defaultTurnTimeLimitSecs !== undefined) {
        ops.push(
          this.prisma.systemSetting.upsert({
            where: { key: SETTING_DEFAULT_TURN_LIMIT },
            update: { value: String(dto.defaultTurnTimeLimitSecs) },
            create: {
              key: SETTING_DEFAULT_TURN_LIMIT,
              value: String(dto.defaultTurnTimeLimitSecs),
            },
          }),
        );
      }

      if (ops.length > 0) {
        await Promise.all(ops);
      }

      return this.getSettings();
    } catch {
      throw new InternalServerErrorException({
        code: 'INTERNAL_ERROR',
        message: 'Sistem ayarları güncellenirken veritabanı hatası oluştu.',
      });
    }
  }
}
