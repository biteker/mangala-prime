import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should_register_new_user_successfully', async () => {
      // Arrange
      const dto = { username: 'testuser', password: 'password123' };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'some-uuid',
        username: 'testuser',
        passwordHash: 'hashed-password',
      });

      // Act
      const result = await service.register(dto);

      // Assert
      expect(result).toEqual({ userId: 'some-uuid', username: 'testuser' });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'testuser' } });
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should_throw_conflict_exception_if_username_already_exists', async () => {
      // Arrange
      const dto = { username: 'testuser', password: 'password123' };
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id', username: 'testuser' });

      // Act & Assert
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should_login_successfully_with_correct_credentials', async () => {
      // Arrange
      const dto = { username: 'testuser', password: 'password123' };
      const hash = await bcrypt.hash('password123', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'some-uuid',
        username: 'testuser',
        passwordHash: hash,
      });
      mockJwt.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
      mockPrisma.user.update.mockResolvedValue({});

      // Act
      const result = await service.login(dto);

      // Assert
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'some-uuid' },
        data: { refreshToken: 'refresh-token' },
      });
    });

    it('should_throw_unauthorized_if_user_not_found', async () => {
      // Arrange
      const dto = { username: 'testuser', password: 'password123' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should_throw_unauthorized_if_password_is_incorrect', async () => {
      // Arrange
      const dto = { username: 'testuser', password: 'wrongpassword' };
      const hash = await bcrypt.hash('password123', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'some-uuid',
        username: 'testuser',
        passwordHash: hash,
      });

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should_rotate_tokens_successfully', async () => {
      // Arrange
      const oldRefreshToken = 'old-refresh';
      mockJwt.verify.mockReturnValue({ sub: 'some-uuid', username: 'testuser' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'some-uuid',
        username: 'testuser',
        refreshToken: oldRefreshToken,
      });
      mockJwt.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');
      mockPrisma.user.update.mockResolvedValue({});

      // Act
      const result = await service.refreshTokens(oldRefreshToken);

      // Assert
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'some-uuid' },
        data: { refreshToken: 'new-refresh' },
      });
    });

    it('should_throw_unauthorized_if_refresh_token_does_not_match_stored', async () => {
      // Arrange
      const oldRefreshToken = 'old-refresh';
      mockJwt.verify.mockReturnValue({ sub: 'some-uuid', username: 'testuser' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'some-uuid',
        username: 'testuser',
        refreshToken: 'different-refresh',
      });

      // Act & Assert
      await expect(service.refreshTokens(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
