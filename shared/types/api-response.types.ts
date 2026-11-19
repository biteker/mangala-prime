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
