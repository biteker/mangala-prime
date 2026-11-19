import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { Roles } from '../common/guards/roles.guard';
import type { AuthenticatedRequest } from '../auth/auth.controller';
import { TournamentService } from './tournament.service';
import {
  CreateTournamentDto,
  JoinTournamentDto,
  SetPairingResultDto,
  DisqualifyParticipantDto,
  StartRoundDto,
} from './dto/tournament.dto';
import type {
  TournamentSummary,
  TournamentDetailResponse,
  PairingResult,
} from '@mangala/shared';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  private extractClientIp(req: AuthenticatedRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const raw =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket.remoteAddress || '127.0.0.1';
    return raw.startsWith('::ffff:') ? raw.substring(7) : raw;
  }

  @Get()
  async listTournaments(
    @Query('schoolName') schoolName?: string,
  ): Promise<TournamentSummary[]> {
    return this.tournamentService.listTournaments(schoolName);
  }

  @Get('my-active-status')
  async getMyActiveStatus(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ hasActiveTournamentMatch: boolean }> {
    const hasActiveTournamentMatch =
      await this.tournamentService.hasActiveTournamentMatch(req.user?.id ?? '');
    return { hasActiveTournamentMatch };
  }

  @Get(':id')
  async getTournamentDetail(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<TournamentDetailResponse> {
    return this.tournamentService.getTournamentDetail(id, req.user?.id ?? '');
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  async createTournament(
    @Body() dto: CreateTournamentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TournamentSummary> {
    return this.tournamentService.createTournament(dto, req.user?.id ?? '');
  }

  @Post('join')
  async joinTournament(
    @Body() dto: JoinTournamentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ tournamentId: string }> {
    return this.tournamentService.joinTournament(
      dto,
      req.user?.id ?? '',
      this.extractClientIp(req),
    );
  }

  @Post(':id/open-check-in')
  @Roles('TEACHER', 'ADMIN')
  async openCheckIn(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ status: string }> {
    return this.tournamentService.openCheckIn(
      id,
      req.user?.id ?? '',
      req.user?.role ?? 'STUDENT',
    );
  }

  @Post(':id/check-in')
  async checkIn(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ checkedIn: boolean }> {
    return this.tournamentService.checkInParticipant(
      id,
      req.user?.id ?? '',
      this.extractClientIp(req),
    );
  }

  @Post(':id/start-round')
  @Roles('TEACHER', 'ADMIN')
  async startRound(
    @Param('id') id: string,
    @Body() dto: StartRoundDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ round: number; pairingsCreated: number }> {
    return this.tournamentService.startNextRound(
      id,
      req.user?.id ?? '',
      req.user?.role ?? 'STUDENT',
      dto.onlyCheckedIn,
    );
  }

  @Patch(':id/pairings/:pairingId/result')
  @Roles('TEACHER', 'ADMIN')
  async overridePairingResult(
    @Param('id') id: string,
    @Param('pairingId') pairingId: string,
    @Body() dto: SetPairingResultDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ result: PairingResult }> {
    return this.tournamentService.overridePairingResult(
      id,
      pairingId,
      dto.result,
      req.user?.id ?? '',
      req.user?.role ?? 'STUDENT',
    );
  }

  @Patch(':id/participants/:userId/disqualify')
  @Roles('TEACHER', 'ADMIN')
  async disqualifyParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: DisqualifyParticipantDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ disqualified: boolean }> {
    return this.tournamentService.setParticipantDisqualified(
      id,
      userId,
      dto.disqualified,
      req.user?.id ?? '',
      req.user?.role ?? 'STUDENT',
    );
  }

  @Get(':id/export')
  @Roles('TEACHER', 'ADMIN')
  async exportCsv(
    @Param('id') id: string,
    @Res() res: express.Response,
  ): Promise<void> {
    const csv = await this.tournamentService.exportStandingsCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="turnuva-${id.slice(0, 8)}.csv"`,
    );
    res.send('\uFEFF' + csv);
  }
}
