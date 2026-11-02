import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEndReason } from '@mangala/shared';
import { useGameStore } from './game.store';

describe('useGameStore (Local PvP)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().disconnectGame();
  });

  afterEach(() => {
    useGameStore.getState().disconnectGame();
    vi.useRealTimers();
  });

  it('should_initialize_local_pvp_game_with_standard_board', () => {
    // Arrange & Act
    useGameStore.getState().startLocalGame();

    // Assert
    const state = useGameStore.getState();
    expect(state.isLocalPvP).toBe(true);
    expect(state.matchId).toBe('local-match');
    expect(state.currentPlayerId).toBe('p1');
    expect(state.board).toEqual([4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
    expect(state.gameOverDetails).toBeNull();
  });

  it('should_switch_turn_to_player_2_after_regular_move', () => {
    // Arrange
    useGameStore.getState().startLocalGame();

    // Act — Kuyu 0'dan (4 taş) oynandığında son taş kuyu 3'e düşer, sıra p2'ye geçer
    useGameStore.getState().makeMove(0);

    // Assert
    const state = useGameStore.getState();
    expect(state.board).toEqual([1, 5, 5, 5, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
    expect(state.currentPlayerId).toBe('p2');
    expect(state.gameError).toBeNull();
  });

  it('should_keep_turn_when_last_stone_lands_in_own_treasury', () => {
    // Arrange
    useGameStore.getState().startLocalGame();

    // Act — Kuyu 3'ten (4 taş) oynandığında son taş p1 hazinesine (indeks 6) düşer
    useGameStore.getState().makeMove(3);

    // Assert
    const state = useGameStore.getState();
    expect(state.board[6]).toBe(1);
    expect(state.currentPlayerId).toBe('p1');
    expect(state.gameError).toBeNull();
  });

  it('should_detect_game_over_and_set_winner_in_local_pvp', () => {
    // Arrange — p1'in son taşı kuyu 5'te, hazinesinde 24 taş var
    useGameStore.getState().startLocalGame();
    useGameStore.setState({
      board: [0, 0, 0, 0, 0, 1, 24, 0, 0, 0, 0, 0, 1, 22],
      currentPlayerId: 'p1',
    });

    // Act — Kuyu 5'teki tek taş hazineye (indeks 6) girer, p1 bölgesi boşalır ve oyun biter
    useGameStore.getState().makeMove(5);

    // Assert
    const state = useGameStore.getState();
    expect(state.currentPlayerId).toBeNull();
    expect(state.gameOverDetails).toEqual({
      matchId: 'local-match',
      winnerId: 'p1',
      reason: GameEndReason.NORMAL,
      p1EloChange: 0,
      p2EloChange: 0,
      finalBoard: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
    });
  });
});
