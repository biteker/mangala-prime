import { Player, GameEndReason } from './game.types';

// Lobby Events
export interface LobbyUserStatusPayload {
  userId: string;
  status: 'lobby' | 'playing' | 'offline';
  username?: string;
  elo?: number;
}

export interface LobbyInviteSendPayload {
  targetUserId: string;
}

export interface LobbyInviteResponsePayload {
  inviterUserId: string;
  accepted: boolean;
}

export interface LobbyInviteTimeoutPayload {
  inviterUserId: string;
}

export interface LobbyQueueTimeoutPayload {
  message: string;
}

export interface LobbyErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

// Game Events
export interface GameMovePayload {
  matchId: string;
  pitIndex: number;
}

export interface GameStateUpdatePayload {
  board: number[];
  nextPlayerId: string;
  turnTimeLeft: number;
}

export interface GameMatchFoundPayload {
  matchId: string;
  opponentUsername: string;
  opponentElo: number;
  yourColor: Player;
}

export interface GameGameOverPayload {
  matchId: string;
  winnerId?: string;
  reason: GameEndReason;
  p1EloChange: number;
  p2EloChange: number;
  finalBoard: number[];
}

export interface GameErrorPayload {
  error: {
    code: string;
    message: string;
  };
  board?: number[];
}

export interface GamePlayerDisconnectedPayload {
  playerId: string;
  reconnectWindowSecs: number;
}

export interface GameReconnectPayload {
  matchId: string;
}

export interface GameReconnectAckPayload {
  board: number[];
  nextPlayerId: string;
  turnTimeLeft: number;
  matchId: string;
  opponentUsername: string;
  yourColor: Player;
}

export interface GameChatTogglePayload {
  matchId: string;
  chatEnabled: boolean;
}

export interface GameMessagePayload {
  matchId: string;
  message: string;
  type: 'text' | 'preset';
}
