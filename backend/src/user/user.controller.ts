import { Controller, Get, Param, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { Public } from '../auth/auth.guard';
import { UserProfileResponse, LeaderboardEntry, UserPublicProfileResponse } from '@mangala/shared';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  async getMe(@Req() req: any): Promise<UserProfileResponse> {
    return this.userService.getUserProfile(req.user.id);
  }

  @Public()
  @Get('leaderboard')
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.userService.getLeaderboard();
  }

  @Public()
  @Get(':username')
  async getUserProfile(@Param('username') username: string): Promise<UserPublicProfileResponse> {
    return this.userService.getUserPublicProfile(username);
  }
}
