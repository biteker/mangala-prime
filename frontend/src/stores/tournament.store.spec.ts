import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MyActiveTournamentStatusResponse } from '@mangala/shared';

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

const mockApiGet = vi.fn();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]): Promise<unknown> => mockApiGet(...args),
  },
}));

import { useTournamentStore } from './tournament.store';
import { useAuthStore } from './auth.store';
import { useGameStore } from './game.store';
import { useLobbyStore } from './lobby.store';

describe('useTournamentStore', () => {
  beforeEach(() => {
    socketHandlers.clear();
    vi.clearAllMocks();
    window.localStorage.clear();
    window.location.hash = '#/lobby';
    useTournamentStore.getState().disconnectTournament();
    useGameStore.getState().disconnectGame();
    useLobbyStore.setState({ socket: null, isInQueue: false });
    useAuthStore.setState({ accessToken: 'valid-token' });
    mockApiGet.mockResolvedValue({
      hasActiveTournamentMatch: false,
      isLockedInTournament: false,
      activeTournamentId: null,
      activeTournamentName: null,
      activeTournamentStatus: null,
      currentRound: null,
      totalRounds: null,
      activeMatchId: null,
      activeSetNumber: null,
      setsPerMatch: null,
      opponentUsername: null,
    } satisfies MyActiveTournamentStatusResponse);
  });

  it('should_update_lock_and_active_tournament_state_on_refreshMyActiveStatus', async () => {
    mockApiGet.mockResolvedValueOnce({
      hasActiveTournamentMatch: true,
      isLockedInTournament: true,
      activeTournamentId: 't-42',
      activeTournamentName: 'Cumhuriyet Kupası',
      activeTournamentStatus: 'IN_PROGRESS',
      currentRound: 3,
      totalRounds: 5,
      activeMatchId: 'match-99',
      activeSetNumber: 1,
      setsPerMatch: 2,
      opponentUsername: 'rakip_oyuncu',
    } satisfies MyActiveTournamentStatusResponse);

    await useTournamentStore.getState().refreshMyActiveStatus();

    const state = useTournamentStore.getState();
    expect(mockApiGet).toHaveBeenCalledWith('/tournaments/my-active-status');
    expect(state.isLockedInTournament).toBe(true);
    expect(state.hasActiveTournamentMatch).toBe(true);
    expect(state.activeTournamentId).toBe('t-42');
    expect(state.activeTournamentName).toBe('Cumhuriyet Kupası');
    expect(state.activeMatchId).toBe('match-99');
    expect(window.localStorage.getItem('activeTournamentId')).toBe('t-42');
  });

  it('should_leave_queue_and_navigate_to_game_when_tournament_match_assigned_from_lobby', () => {
    const mockLobbyEmit = vi.fn();
    useLobbyStore.setState({
      socket: {
        connected: true,
        emit: mockLobbyEmit,
      } as never,
      isInQueue: true,
    });

    useTournamentStore.getState().connectTournament();
    const matchAssignedHandler = socketHandlers.get('tournament:match_assigned');
    expect(matchAssignedHandler).toBeDefined();

    matchAssignedHandler?.({
      tournamentId: 't-10',
      pairingId: 'pair-1',
      matchId: 't-match-1',
      round: 2,
      tableNumber: 1,
      setNumber: 1,
      setsPerMatch: 2,
      opponentUsername: 'rakip1',
    });

    expect(mockLobbyEmit).toHaveBeenCalledWith('lobby:queue_leave');
    expect(useLobbyStore.getState().isInQueue).toBe(false);
    expect(useGameStore.getState().matchId).toBe('t-match-1');
    expect(useGameStore.getState().tournamentId).toBe('t-10');
    expect(useGameStore.getState().tournamentSetNumber).toBe(1);
    expect(window.location.hash).toBe('#/game');
  });

  it('should_populate_nextTournamentMatchId_without_interrupting_set_1_when_set_2_assigned', () => {
    window.location.hash = '#/game';
    useGameStore.setState({
      matchId: 't-match-set-1',
      tournamentId: 't-10',
      tournamentSetNumber: 1,
      tournamentSetsPerMatch: 2,
    });

    useTournamentStore.getState().connectTournament();
    const matchAssignedHandler = socketHandlers.get('tournament:match_assigned');

    matchAssignedHandler?.({
      tournamentId: 't-10',
      pairingId: 'pair-1',
      matchId: 't-match-set-2',
      round: 1,
      tableNumber: 1,
      setNumber: 2,
      setsPerMatch: 2,
      opponentUsername: 'rakip1',
    });

    const gameState = useGameStore.getState();
    expect(gameState.matchId).toBe('t-match-set-1');
    expect(gameState.tournamentSetNumber).toBe(1);
    expect(gameState.nextTournamentMatchId).toBe('t-match-set-2');
    expect(window.location.hash).toBe('#/game');
  });
});
