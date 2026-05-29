import { BoardState, Player } from '@mangala/shared';

export interface GameRoom {
  matchId: string;
  player1SocketId: string;
  player2SocketId: string;
  board: BoardState;
  currentPlayer: Player;
  timer: NodeJS.Timeout | null;
  turnTimeLeft: number;
}
