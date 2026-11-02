import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { LeaderboardEntry } from '@mangala/shared';
import { LeaderboardModal } from './LeaderboardModal';

const mockGet = vi.fn();

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]): Promise<unknown> => mockGet(...args),
  },
}));

describe('LeaderboardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_loading_state_while_fetching_leaderboard', () => {
    // Arrange
    mockGet.mockReturnValueOnce(new Promise(() => {}));

    // Act
    render(<LeaderboardModal isOpen={true} onClose={vi.fn()} />);

    // Assert
    expect(
      screen.getByText('Liderlik tablosu yükleniyor...'),
    ).toBeInTheDocument();
  });

  it('should_render_leaderboard_entries_and_highlight_current_user_row', async () => {
    // Arrange
    const entries: LeaderboardEntry[] = [
      {
        rank: 1,
        username: 'sampiyon_1',
        elo: 1450,
        wins: 18,
        totalMatches: 20,
      },
      {
        rank: 2,
        username: 'biteker',
        elo: 1320,
        wins: 12,
        totalMatches: 16,
      },
    ];
    mockGet.mockResolvedValueOnce(entries);

    // Act
    render(
      <LeaderboardModal
        isOpen={true}
        onClose={vi.fn()}
        currentUsername="biteker"
      />,
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('sampiyon_1')).toBeInTheDocument();
    });
    expect(screen.getByText('1450')).toBeInTheDocument();
    expect(screen.getByText('18G / 2M')).toBeInTheDocument();
    expect(screen.getByText('%90')).toBeInTheDocument();

    const selfBadge = screen.getByText('Sen');
    expect(selfBadge).toBeInTheDocument();
    const selfRow = selfBadge.closest('tr');
    expect(selfRow).toHaveAttribute('data-current-user', 'true');
    expect(selfRow).toHaveClass('leaderboard-row-self');
  });

  it('should_render_empty_state_when_leaderboard_is_empty', async () => {
    // Arrange
    mockGet.mockResolvedValueOnce([]);

    // Act
    render(<LeaderboardModal isOpen={true} onClose={vi.fn()} />);

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText('Henüz sıralamada oyuncu bulunmuyor.'),
      ).toBeInTheDocument();
    });
  });

  it('should_render_user_friendly_error_message_when_request_fails', async () => {
    // Arrange
    mockGet.mockRejectedValueOnce({
      code: 'INTERNAL_ERROR',
      message: 'Liderlik tablosu şu anda alınamıyor.',
    });

    // Act
    render(<LeaderboardModal isOpen={true} onClose={vi.fn()} />);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Liderlik tablosu şu anda alınamıyor.',
      );
    });
    expect(
      screen.getByRole('button', { name: 'Tekrar Dene' }),
    ).toBeInTheDocument();
  });
});
