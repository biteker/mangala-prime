import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { APP_CONFIG, loadAppConfig } from '../common/config/app-config';
import { AssignableRole } from './dto/admin.dto';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrisma = {
    trustedSchoolIp: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    systemSetting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    tournament: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: APP_CONFIG, useValue: loadAppConfig(process.env) },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('should_return_true_when_ip_is_active_trusted_school_ip', async () => {
    mockPrisma.trustedSchoolIp.findFirst.mockResolvedValue({ id: 'ip-1' });
    await expect(service.isTrustedSchoolIp('88.255.10.20')).resolves.toBe(true);
  });

  it('should_return_false_when_ip_is_not_in_trusted_school_list', async () => {
    mockPrisma.trustedSchoolIp.findFirst.mockResolvedValue(null);
    await expect(service.isTrustedSchoolIp('192.168.1.1')).resolves.toBe(false);
  });

  it('should_reject_duplicate_school_ip_creation_with_conflict', async () => {
    mockPrisma.trustedSchoolIp.findUnique.mockResolvedValue({ id: 'ip-1' });
    await expect(
      service.createSchoolIp(
        { schoolName: 'Atatürk Ortaokulu', ipAddress: '88.255.10.20' },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should_create_and_return_trusted_school_ip', async () => {
    const now = new Date();
    mockPrisma.trustedSchoolIp.findUnique.mockResolvedValue(null);
    mockPrisma.trustedSchoolIp.create.mockResolvedValue({
      id: 'ip-1',
      schoolName: 'Atatürk Ortaokulu',
      ipAddress: '88.255.10.20',
      isActive: true,
      notes: 'MEB Hattı',
      createdAt: now,
    });

    const result = await service.createSchoolIp(
      {
        schoolName: ' Atatürk Ortaokulu ',
        ipAddress: '88.255.10.20',
        notes: 'MEB Hattı',
      },
      'admin-1',
    );

    expect(result.schoolName).toBe('Atatürk Ortaokulu');
    expect(result.isActive).toBe(true);
  });

  it('should_update_user_role_and_school_name', async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      username: 'ogretmen1',
      role: 'TEACHER',
      schoolName: 'Atatürk Ortaokulu',
      eloScore: 1000,
      wins: 0,
      losses: 0,
      createdAt: now,
    });

    const updated = await service.updateUserRole('u-1', {
      role: AssignableRole.TEACHER,
      schoolName: 'Atatürk Ortaokulu',
    });

    expect(updated.role).toBe('TEACHER');
    expect(updated.schoolName).toBe('Atatürk Ortaokulu');
  });

  it('should_throw_not_found_when_resetting_password_for_unknown_user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.resetUserPassword('missing', 'newpass123'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should_prevent_admin_from_bulk_deleting_only_themselves', async () => {
    await expect(
      service.bulkDeleteUsers(['admin-1'], 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_bulk_create_new_students_and_skip_existing_usernames', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ username: '5A_01' }]);
    mockPrisma.user.createMany.mockResolvedValue({ count: 2 });

    const res = await service.bulkCreateUsers({
      usernames: ['5A_01', '5A_02', '5A_03'],
      defaultPassword: 'password123',
      schoolName: 'Atatürk Ortaokulu',
    });

    expect(res.created).toEqual(['5A_02', '5A_03']);
    expect(res.skipped).toEqual(['5A_01']);
    expect(mockPrisma.user.createMany).toHaveBeenCalledTimes(1);
  });

  it('should_reset_elo_for_selected_users', async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 3 });

    const res = await service.resetUsersElo(['u1', 'u2', 'u3']);

    expect(res.resetCount).toBe(3);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2', 'u3'] } },
      data: { eloScore: 1000, wins: 0, losses: 0 },
    });
  });

  it('should_delete_tournament_when_found', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({ id: 't-1' });
    mockPrisma.tournament.delete.mockResolvedValue({ id: 't-1' });

    const res = await service.deleteTournament('t-1');
    expect(res.deleted).toBe(true);
  });
});
