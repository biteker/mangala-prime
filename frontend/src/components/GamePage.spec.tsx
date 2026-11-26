import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { GameEndReason } from '@mangala/shared';

const mockSocket = {
  connected: true,
  active: true,
  on: vi.fn().mockReturnThis(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('./MangalaBoard/MangalaReactBoard', () => ({
  MangalaReactBoard: () => <div data-testid="mangala-board" />,
}));

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      hasActiveTournamentMatch: false,
      isLockedInTournament: true,
      activeTournamentId: 't-1',
      activeTournamentName: 'Okul Turnuvası',
      activeTournamentStatus: 'IN_PROGRESS',
      currentRound: 1,
      totalRounds: 5,
      activeMatchId: null,
      activeSetNumber: null,
      setsPerMatch: 2,
      opponentUsername: null,
    }),
  },
}));

import { GamePage } from './GamePage';
import { useAuthStore } from '../stores/auth.store';
import { useGameStore } from '../stores/game.store';
import { useTournamentStore } from '../stores/tournament.store';

describe('GamePage (Tournament Redirect & Set Transition)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    window.location.hash = '#/game';
    useTournamentStore.getState().disconnectTournament();
    useGameStore.getState().disconnectGame();
    useAuthStore.setState({
      accessToken: 'jwt-token',
      user: {
        id: 'u1',
        username: 'ali',
        role: 'STUDENT',
        elo: 1050,
        totalMatches: 4,
        wins: 2,
        losses: 2,
      },
    });
  });

  afterEach(() => {
    cleanup();
    useGameStore.getState().disconnectGame();
    vi.useRealTimers();
  });

  it('should_navigate_to_tournaments_and_stay_there_when_return_to_tournament_button_clicked', () => {
    useGameStore.setState({
      socket: mockSocket as never,
      matchId: 't-match-final',
      tournamentId: 't-1',
      tournamentSetNumber: 2,
      tournamentSetsPerMatch: 2,
      nextTournamentMatchId: null,
      yourColor: 0,
      opponentUsername: 'veli',
      opponentElo: 1000,
      board: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      gameOverDetails: {
        matchId: 't-match-final',
        winnerId: 'u1',
        reason: GameEndReason.NORMAL,
        p1EloChange: 0,
        p2EloChange: 0,
        finalBoard: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      },
    });

    render(<GamePage />);

    const returnBtn = screen.getByRole('button', {
      name: /Turnuva Salonuna Dön/i,
    });
    fireEvent.click(returnBtn);

    expect(window.location.hash).toBe('#/tournaments');
    expect(useGameStore.getState().matchId).toBeNull();
  });

  it('should_auto_navigate_to_tournaments_after_8s_on_tournament_round_end', () => {
    useGameStore.setState({
      socket: mockSocket as never,
      matchId: 't-match-final',
      tournamentId: 't-1',
      tournamentSetNumber: 1,
      tournamentSetsPerMatch: 1,
      nextTournamentMatchId: null,
      yourColor: 0,
      opponentUsername: 'veli',
      opponentElo: 1000,
      board: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      gameOverDetails: {
        matchId: 't-match-final',
        winnerId: 'u1',
        reason: GameEndReason.NORMAL,
        p1EloChange: 0,
        p2EloChange: 0,
        finalBoard: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      },
    });

    render(<GamePage />);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(window.location.hash).toBe('#/tournaments');
    expect(useGameStore.getState().matchId).toBeNull();
  });

  it('should_render_set_2_transition_and_not_redirect_after_8s_when_set_1_finishes_in_2_set_match', () => {
    useGameStore.setState({
      socket: mockSocket as never,
      matchId: 't-match-set-1',
      tournamentId: 't-1',
      tournamentSetNumber: 1,
      tournamentSetsPerMatch: 2,
      nextTournamentMatchId: 't-match-set-2',
      yourColor: 0,
      opponentUsername: 'veli',
      opponentElo: 1000,
      board: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      gameOverDetails: {
        matchId: 't-match-set-1',
        winnerId: 'u1',
        reason: GameEndReason.NORMAL,
        p1EloChange: 0,
        p2EloChange: 0,
        finalBoard: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      },
    });

    render(<GamePage />);

    expect(
      screen.getByRole('button', { name: /Hemen 2\. Sete Geç/i }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(window.location.hash).toBe('#/game');
    expect(useGameStore.getState().matchId).toBe('t-match-set-2');
    expect(useGameStore.getState().tournamentSetNumber).toBe(2);
  });
});
