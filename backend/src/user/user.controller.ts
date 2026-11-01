import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Public } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.controller';
import {
  UserProfileResponse,
  LeaderboardEntry,
  UserPublicProfileResponse,
} from '@mangala/shared';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserProfileResponse> {
    if (!req.user?.id) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Kimlik doğrulama gerekli.',
      });
    }
    return this.userService.getUserProfile(req.user.id);
  }

  @Public()
  @Get('leaderboard')
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.userService.getLeaderboard();
  }

  @Public()
  @Get(':username')
  async getUserProfile(
    @Param('username') username: string,
  ): Promise<UserPublicProfileResponse> {
    return this.userService.getUserPublicProfile(username);
  }
}
