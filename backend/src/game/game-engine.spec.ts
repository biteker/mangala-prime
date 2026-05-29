import { GameEngineService } from './game-engine.service';
import { BoardState, Player } from '@mangala/shared';
import { BadRequestException } from '@nestjs/common';

describe('GameEngineService', () => {
  let service: GameEngineService;

  beforeEach(() => {
    service = new GameEngineService();
  });

  it('should_grant_extra_turn_when_last_stone_lands_in_treasury', () => {
    // Arrange
    const board: BoardState = [4, 4, 5, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
    const pitIndex = 2;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.extraTurn).toBe(true);
    expect(result.nextPlayer).toBe(0);
    expect(result.gameOver).toBe(false);
    expect(result.newBoard).toEqual([4, 4, 1, 5, 5, 5, 1, 4, 4, 4, 4, 4, 4, 0]);
  });

  it('should_capture_opponent_stones_on_even_count', () => {
    // Arrange
    const board: BoardState = [4, 4, 4, 4, 5, 4, 0, 4, 3, 4, 4, 4, 4, 0];
    const pitIndex = 4;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.extraTurn).toBe(false);
    expect(result.nextPlayer).toBe(1);
    expect(result.gameOver).toBe(false);
    expect(result.capturedPits).toEqual([8]);
    expect(result.newBoard).toEqual([4, 4, 4, 4, 1, 5, 5, 5, 0, 4, 4, 4, 4, 0]);
  });

  it('should_execute_turan_tactic_correctly', () => {
    // Arrange
    const board: BoardState = [4, 4, 4, 0, 4, 4, 0, 4, 4, 5, 4, 4, 4, 0];
    const pitIndex = 0;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.extraTurn).toBe(false);
    expect(result.nextPlayer).toBe(1);
    expect(result.gameOver).toBe(false);
    expect(result.capturedPits).toEqual(expect.arrayContaining([3, 9]));
    expect(result.newBoard).toEqual([1, 5, 5, 0, 4, 4, 6, 4, 4, 0, 4, 4, 4, 0]);
  });

  it('should_skip_turan_if_opposite_pit_is_empty', () => {
    // Arrange
    const board: BoardState = [4, 4, 4, 0, 4, 4, 0, 4, 4, 0, 4, 4, 4, 0];
    const pitIndex = 0;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.extraTurn).toBe(false);
    expect(result.nextPlayer).toBe(1);
    expect(result.gameOver).toBe(false);
    expect(result.capturedPits).toBeUndefined();
    expect(result.newBoard).toEqual([1, 5, 5, 1, 4, 4, 0, 4, 4, 0, 4, 4, 4, 0]);
  });

  it('should_handle_single_stone_move_properly', () => {
    // Arrange
    const board: BoardState = [4, 4, 4, 4, 1, 4, 0, 4, 4, 4, 4, 4, 4, 0];
    const pitIndex = 4;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.extraTurn).toBe(false);
    expect(result.nextPlayer).toBe(1);
    expect(result.gameOver).toBe(false);
    expect(result.newBoard).toEqual([4, 4, 4, 4, 0, 5, 0, 4, 4, 4, 4, 4, 4, 0]);
  });

  it('should_skip_opponent_treasury_during_distribution', () => {
    // Arrange
    const board: BoardState = [4, 4, 4, 4, 4, 10, 0, 4, 4, 4, 4, 4, 4, 0];
    const pitIndex = 5;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.extraTurn).toBe(false);
    expect(result.nextPlayer).toBe(1);
    expect(result.gameOver).toBe(false);
    expect(result.newBoard).toEqual([5, 5, 4, 4, 4, 1, 1, 5, 5, 5, 5, 5, 5, 0]);
  });

  it('should_end_game_when_treasury_reaches_25', () => {
    // Arrange
    const board: BoardState = [4, 4, 4, 4, 4, 5, 24, 4, 4, 4, 4, 4, 4, 0];
    const pitIndex = 5;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(0);
  });

  it('should_clear_board_and_transfer_remaining_stones_on_finish', () => {
    // Arrange
    const board: BoardState = [0, 0, 0, 0, 0, 1, 10, 4, 4, 4, 4, 4, 4, 5];
    const pitIndex = 5;
    const currentPlayer: Player = 0;

    // Act
    const result = service.processMove(board, pitIndex, currentPlayer);

    // Assert
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(0);
    expect(result.newBoard).toEqual([0, 0, 0, 0, 0, 0, 35, 0, 0, 0, 0, 0, 0, 5]);
  });

  describe('Validations', () => {
    it('should_throw_bad_request_if_board_length_is_invalid', () => {
      const board: BoardState = [4, 4, 4];
      expect(() => service.processMove(board, 0, 0)).toThrow(BadRequestException);
    });

    it('should_throw_bad_request_if_invalid_pit_index', () => {
      const board: BoardState = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
      expect(() => service.processMove(board, -1, 0)).toThrow(BadRequestException);
      expect(() => service.processMove(board, 6, 0)).toThrow(BadRequestException);
      expect(() => service.processMove(board, 13, 0)).toThrow(BadRequestException);
      expect(() => service.processMove(board, 14, 0)).toThrow(BadRequestException);
    });

    it('should_throw_bad_request_if_selecting_pit_not_owned_by_player', () => {
      const board: BoardState = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
      expect(() => service.processMove(board, 7, 0)).toThrow(BadRequestException);
      expect(() => service.processMove(board, 2, 1)).toThrow(BadRequestException);
    });

    it('should_throw_bad_request_if_selected_pit_is_empty', () => {
      const board: BoardState = [4, 4, 0, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
      expect(() => service.processMove(board, 2, 0)).toThrow(BadRequestException);
    });
  });
});
