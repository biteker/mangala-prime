export type BoardState = number[]; // 14 elemanlı dizi: 0-5 oyuncu 1 kuyuları, 6 oyuncu 1 haznesi, 7-12 oyuncu 2 kuyuları, 13 oyuncu 2 haznesi

export type Player = 0 | 1;

export interface MoveResult {
  newBoard: BoardState;
  nextPlayer: Player;
  extraTurn: boolean;
  gameOver: boolean;
  winner?: Player;
  capturedPits?: number[];
}

export enum MatchStatus {
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  ABANDONED = 'ABANDONED',
}

export enum GameEndReason {
  NORMAL = 'NORMAL',
  TIMEOUT = 'TIMEOUT',
  DISCONNECT = 'DISCONNECT',
  FORFEIT = 'FORFEIT',
}
