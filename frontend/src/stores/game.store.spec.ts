import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEndReason } from '@mangala/shared';

const socketHandlers = new Map<string, (...args: unknown[]) => void>();
const mockSocket = {
  connected: true,
  active: true,
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    socketHandlers.set(event, handler);
    return mockSocket;
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { getBotMoveDelayMs, useGameStore } from './game.store';
import { useAuthStore } from './auth.store';

describe('useGameStore (Local PvP)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketHandlers.clear();
    vi.clearAllMocks();
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

  it('should_trigger_bot_move_automatically_after_thinking_delay_in_bot_mode', () => {
    // Arrange
    useGameStore.getState().startBotGame('medium');

    // Act — Oyuncu 1 kuyu 0'dan (4 taş) oynar, sıra bota ('p2') geçer
    useGameStore.getState().makeMove(0);
    expect(useGameStore.getState().currentPlayerId).toBe('p2');

    // Animasyon + bot düşünme süresi ilerletilir (medium bot kuyu 10'dan ekstra hamle alır ve tekrar oynar)
    const fourStoneDelay = getBotMoveDelayMs(4, false);
    vi.advanceTimersByTime(fourStoneDelay);
    expect(useGameStore.getState().board[13]).toBeGreaterThanOrEqual(1);

    // İkinci hamlesini de yapması için süre ilerletilir
    vi.advanceTimersByTime(fourStoneDelay);

    // Assert — Sıra tekrar insan oyuncuya ('p1') dönmüş olmalı
    expect(useGameStore.getState().currentPlayerId).toBe('p1');
  });

  it('should_preserve_set_1_status_on_tournament_next_set_and_advance_to_set_2_on_connect', () => {
    // Arrange
    useAuthStore.setState({ accessToken: 'test-token' });
    useGameStore.getState().connectGame('match-set-1');
    useGameStore.setState({
      tournamentId: 't-1',
      tournamentSetNumber: 1,
      tournamentSetsPerMatch: 2,
    });

    const nextSetHandler = socketHandlers.get('game:tournament_next_set');
    expect(nextSetHandler).toBeDefined();

    // Eski/başka maça ait stale olay yoksayılmalı
    nextSetHandler?.({
      oldMatchId: 'other-match',
      newMatchId: 'wrong-next',
      tournamentId: 't-1',
      setNumber: 2,
      setsPerMatch: 2,
    });
    expect(useGameStore.getState().nextTournamentMatchId).toBeNull();

    // Act — 1. set bittiğinde 2. set bilgisi gelir; ancak aktif ekran hâlâ 1. set olarak kalmalı
    nextSetHandler?.({
      oldMatchId: 'match-set-1',
      newMatchId: 'match-set-2',
      tournamentId: 't-1',
      setNumber: 2,
      setsPerMatch: 2,
    });

    expect(useGameStore.getState().tournamentSetNumber).toBe(1);
    expect(useGameStore.getState().nextTournamentMatchId).toBe('match-set-2');

    // Act — 2. sete gerçekten geçildiğinde set numarası 2 olmalı
    useGameStore.getState().connectGame('match-set-2');
    const state = useGameStore.getState();
    expect(state.matchId).toBe('match-set-2');
    expect(state.tournamentId).toBe('t-1');
    expect(state.tournamentSetNumber).toBe(2);
    expect(state.tournamentSetsPerMatch).toBe(2);
    expect(state.nextTournamentMatchId).toBeNull();
  });
});
