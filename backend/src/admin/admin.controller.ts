import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../common/guards/roles.guard';
import type { AuthenticatedRequest } from '../auth/auth.controller';
import { AdminService } from './admin.service';
import {
  CreateSchoolIpDto,
  UpdateSchoolIpDto,
  UpdateUserRoleDto,
  UpdateUserProfileDto,
  ResetUserPasswordDto,
  BulkDeleteUsersDto,
  BulkCreateUsersDto,
  ResetEloDto,
  UpdateAdminSettingsDto,
} from './dto/admin.dto';
import type {
  TrustedSchoolIpItem,
  AdminUserItem,
  AdminSettingsResponse,
  AdminMyIpResponse,
  AdminBulkDeleteResult,
  AdminBulkCreateResult,
  AdminResetEloResult,
  TournamentSummary,
} from '@mangala/shared';

@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private extractClientIp(req: AuthenticatedRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const raw =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket.remoteAddress || '127.0.0.1';
    return raw.startsWith('::ffff:') ? raw.substring(7) : raw;
  }

  @Get('my-ip')
  async getMyIp(@Req() req: AuthenticatedRequest): Promise<AdminMyIpResponse> {
    const ipAddress = this.extractClientIp(req);
    const isTrustedSchoolIp =
      await this.adminService.isTrustedSchoolIp(ipAddress);
    return { ipAddress, isTrustedSchoolIp };
  }

  @Get('school-ips')
  async listSchoolIps(): Promise<TrustedSchoolIpItem[]> {
    return this.adminService.listSchoolIps();
  }

  @Post('school-ips')
  async createSchoolIp(
    @Body() dto: CreateSchoolIpDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TrustedSchoolIpItem> {
    return this.adminService.createSchoolIp(dto, req.user?.id ?? '');
  }

  @Patch('school-ips/:id')
  async updateSchoolIp(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolIpDto,
  ): Promise<TrustedSchoolIpItem> {
    return this.adminService.updateSchoolIp(id, dto);
  }

  @Delete('school-ips/:id')
  async deleteSchoolIp(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.adminService.deleteSchoolIp(id);
  }

  @Get('users')
  async listUsers(@Query('search') search?: string): Promise<AdminUserItem[]> {
    return this.adminService.listUsers(search);
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<AdminUserItem> {
    return this.adminService.updateUserRole(id, dto);
  }

  @Post('users/:id/reset-password')
  async resetUserPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
  ): Promise<{ reset: boolean }> {
    return this.adminService.resetUserPassword(id, dto.newPassword);
  }

  @Get('settings')
  async getSettings(): Promise<AdminSettingsResponse> {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  async updateSettings(
    @Body() dto: UpdateAdminSettingsDto,
  ): Promise<AdminSettingsResponse> {
    return this.adminService.updateSettings(dto);
  }

  @Post('users/bulk-delete')
  async bulkDeleteUsers(
    @Body() dto: BulkDeleteUsersDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AdminBulkDeleteResult> {
    return this.adminService.bulkDeleteUsers(dto.userIds, req.user?.id ?? '');
  }

  @Patch('users/:id/profile')
  async updateUserProfile(
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<AdminUserItem> {
    return this.adminService.updateUserProfile(id, dto);
  }

  @Post('users/bulk-create')
  async bulkCreateUsers(
    @Body() dto: BulkCreateUsersDto,
  ): Promise<AdminBulkCreateResult> {
    return this.adminService.bulkCreateUsers(dto);
  }

  @Post('users/reset-elo')
  async resetUsersElo(@Body() dto: ResetEloDto): Promise<AdminResetEloResult> {
    return this.adminService.resetUsersElo(dto.userIds);
  }

  @Get('tournaments')
  async listTournaments(): Promise<TournamentSummary[]> {
    return this.adminService.listAllTournaments();
  }

  @Delete('tournaments/:id')
  async deleteTournament(
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    return this.adminService.deleteTournament(id);
  }
}
