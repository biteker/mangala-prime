import { describe, it, expect } from 'vitest';
import {
  createInitialBoard,
  getLegalMoves,
  type BoardState,
} from '@mangala/shared';
import { chooseBotMove, type BotLevel } from './bot-engine';

describe('bot-engine (chooseBotMove)', () => {
  it('should_always_return_a_legal_move_for_all_difficulty_levels', () => {
    // Arrange
    const board = createInitialBoard();
    const levels: BotLevel[] = ['easy', 'medium', 'hard'];
    const legalForP2 = getLegalMoves(board, 1);

    // Act & Assert
    for (const level of levels) {
      const chosenPit = chooseBotMove(board, 1, level, () => 0.42);
      expect(legalForP2).toContain(chosenPit);
    }
  });

  it('should_use_injected_rng_deterministically_in_easy_mode', () => {
    // Arrange
    const board = createInitialBoard();

    // Act
    const firstChoice = chooseBotMove(board, 1, 'easy', () => 0.0);
    const lastChoice = chooseBotMove(board, 1, 'easy', () => 0.99);

    // Assert
    expect(firstChoice).toBe(7);
    expect(lastChoice).toBe(12);
  });

  it('should_prefer_extra_turn_move_in_medium_mode', () => {
    // Arrange — P2 için kuyu 10'da 4 taş var (10 -> 10, 11, 12, 13 [P2 Hazinesi] => ekstra hamle)
    // Diğer kuyularda ekstra hamle vermeyen taş sayıları var
    const board: BoardState = [
      4, 4, 4, 4, 4, 4, 0,
      2, 2, 2, 4, 2, 2, 0,
    ];

    // Act
    const move = chooseBotMove(board, 1, 'medium');

    // Assert
    expect(move).toBe(10);
  });

  it('should_find_immediate_winning_move_in_hard_mode', () => {
    // Arrange — P2 hazinesinde 24 taş var.
    // Kuyu 12'de 1 taş var (oynandığında doğrudan 13'e düşer ve 25 taş ile anında kazanır).
    // Kuyu 7'de 2 taş var (son taş kuyu 8'e düşer, karşı kuyu 4 boş olduğu için Turan olmaz ve kazandırmaz).
    const board: BoardState = [
      4, 4, 4, 4, 0, 4, 19,
      2, 0, 0, 0, 0, 1, 24,
    ];

    // Act
    const move = chooseBotMove(board, 1, 'hard');

    // Assert
    expect(move).toBe(12);
  });

  it('should_compute_hard_move_under_500ms_on_standard_board', () => {
    // Arrange
    const board = createInitialBoard();

    // Act
    const start = performance.now();
    const move = chooseBotMove(board, 1, 'hard');
    const elapsedMs = performance.now() - start;

    // Assert
    expect(getLegalMoves(board, 1)).toContain(move);
    expect(elapsedMs).toBeLessThan(500);
  });
});
