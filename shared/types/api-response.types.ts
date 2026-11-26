export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Auth Request / Response Types
export interface AuthRegisterResponse {
  userId: string;
  username: string;
}

export interface AuthLoginResponse {
  accessToken: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
}

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

// User Profile Types
export interface UserProfileResponse {
  id: string;
  username: string;
  role: UserRole;
  schoolName?: string | null;
  elo: number;
  totalMatches: number;
  wins: number;
  losses: number;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  username: string;
  elo: number;
  wins: number;
  totalMatches: number;
}

// User Profile Search Response
export interface UserPublicProfileResponse {
  username: string;
  elo: number;
  matchHistory: {
    id: string;
    opponent: string;
    result: 'WIN' | 'LOSS' | 'DRAW';
    eloChange: number;
    date: string;
  }[];
}

// Match Details
export interface MatchDetailsResponse {
  id: string;
  status: string; // 'ACTIVE' | 'FINISHED' | 'ABANDONED'
  board: number[];
  players: {
    id: string;
    username: string;
    elo: number;
  }[];
  winnerId?: string;
  moves: {
    player: 0 | 1;
    fromPit: number;
    stones: number;
    timestamp: string;
  }[];
}

// Admin Dashboard Types
export interface TrustedSchoolIpItem {
  id: string;
  schoolName: string;
  ipAddress: string;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  username: string;
  role: UserRole;
  schoolName?: string | null;
  elo: number;
  wins: number;
  losses: number;
  createdAt: string;
}

export interface AdminSettingsResponse {
  schoolDailyRankedPairLimit: number;
  defaultTurnTimeLimitSecs: number;
}

export interface AdminMyIpResponse {
  ipAddress: string;
  isTrustedSchoolIp: boolean;
}

export interface AdminBulkDeleteResult {
  deletedCount: number;
}

export interface AdminBulkCreateResult {
  created: string[];
  skipped: string[];
}

export interface AdminResetEloResult {
  resetCount: number;
}

// Tournament Types (Phase E: T-20..T-24)
export type TournamentFormat = 'SWISS' | 'KNOCKOUT';
export type TournamentStatus =
  | 'DRAFT'
  | 'REGISTRATION'
  | 'CHECK_IN'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELLED';
export type PairingResult =
  | 'PENDING'
  | 'P1_WIN'
  | 'P2_WIN'
  | 'DRAW'
  | 'BYE'
  | 'NO_SHOW_P1'
  | 'NO_SHOW_P2';

export interface TournamentSummary {
  id: string;
  name: string;
  joinCode: string;
  schoolName?: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  totalRounds: number;
  currentRound: number;
  setsPerMatch: number;
  turnTimeLimitSecs: number;
  affectsGlobalElo: boolean;
  participantCount: number;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
}

export interface TournamentParticipantView {
  id: string;
  userId: string;
  username: string;
  elo: number;
  classLabel?: string | null;
  points: number;
  buchholz: number;
  wins: number;
  draws: number;
  losses: number;
  checkedIn: boolean;
  disqualified: boolean;
  sharedNetworkWarning: boolean;
}

export interface TournamentPairingView {
  id: string;
  round: number;
  tableNumber: number;
  player1Id: string;
  player1Username: string;
  player2Id: string | null;
  player2Username: string | null;
  activeMatchId: string | null;
  setNumber: number;
  p1SetWins: number;
  p2SetWins: number;
  result: PairingResult;
}

export interface TournamentDetailResponse extends TournamentSummary {
  participants: TournamentParticipantView[];
  pairings: TournamentPairingView[];
  myActiveMatchId: string | null;
}

export interface MyActiveTournamentStatusResponse {
  hasActiveTournamentMatch: boolean;
  isLockedInTournament: boolean;
  activeTournamentId: string | null;
  activeTournamentName: string | null;
  activeTournamentStatus: TournamentStatus | null;
  currentRound: number | null;
  totalRounds: number | null;
  activeMatchId: string | null;
  activeSetNumber: number | null;
  setsPerMatch: number | null;
  opponentUsername: string | null;
}
