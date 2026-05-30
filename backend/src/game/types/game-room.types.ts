import { BoardState, Player } from '@mangala/shared';

export interface GameRoom {
  matchId: string;
  player1Id: string;
  player2Id: string;
  player1Username: string;
  player2Username: string;
  player1SocketId: string;
  player2SocketId: string;
  board: BoardState;
  currentPlayer: Player;
  timer: NodeJS.Timeout | null;
  turnTimeLeft: number;
  p1ChatEnabled: boolean;
  p2ChatEnabled: boolean;
  turnExpiresAt?: number;
}
