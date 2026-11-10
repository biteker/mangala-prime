import { Injectable, BadRequestException } from '@nestjs/common';
import {
  applyMove,
  MangalaRuleError,
  type BoardState,
  type Player,
  type MoveResult,
} from '@mangala/shared';

@Injectable()
export class GameEngineService {
  processMove(
    board: BoardState,
    pitIndex: number,
    currentPlayer: Player,
  ): MoveResult {
    try {
      return applyMove(board, pitIndex, currentPlayer);
    } catch (error: unknown) {
      if (error instanceof MangalaRuleError) {
        throw new BadRequestException({
          code:
            error.code === 'INVALID_BOARD' ? 'INVALID_BOARD' : 'INVALID_MOVE',
          message: error.message,
        });
      }
      throw error;
    }
  }
}
