import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { UserPublicProfileResponse } from '@mangala/shared';
import { ProfileModal } from './ProfileModal';

const mockGet = vi.fn();

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]): Promise<unknown> => mockGet(...args),
  },
}));

describe('ProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_loading_state_while_fetching_profile', () => {
    // Arrange
    mockGet.mockReturnValueOnce(new Promise(() => {}));

    // Act
    render(
      <ProfileModal isOpen={true} onClose={vi.fn()} username="biteker" />,
    );

    // Assert
    expect(
      screen.getByText('Profil bilgileri yükleniyor...'),
    ).toBeInTheDocument();
  });

  it('should_render_profile_stats_and_match_history_with_friendly_badge', async () => {
    // Arrange
    const sampleProfile: UserPublicProfileResponse = {
      username: 'biteker',
      elo: 1285,
      matchHistory: [
        {
          id: 'match-1',
          opponent: 'rakip_1',
          result: 'WIN',
          eloChange: 16,
          date: '2026-10-30T18:00:00.000Z',
        },
        {
          id: 'match-2',
          opponent: 'ayni_ip_oyuncu',
          result: 'LOSS',
          eloChange: 0,
          date: '2026-10-29T18:00:00.000Z',
        },
      ],
    };
    mockGet.mockResolvedValueOnce(sampleProfile);

    // Act
    render(
      <ProfileModal isOpen={true} onClose={vi.fn()} username="biteker" />,
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('1285')).toBeInTheDocument();
    });
    expect(screen.getByText('1G / 1M')).toBeInTheDocument();
    expect(screen.getByText('%50')).toBeInTheDocument();
    expect(screen.getByText('rakip_1')).toBeInTheDocument();
    expect(screen.getByText('+16')).toBeInTheDocument();
    expect(screen.getByText('ayni_ip_oyuncu')).toBeInTheDocument();
    expect(screen.getByText('Dostluk')).toBeInTheDocument();
  });

  it('should_render_error_state_when_profile_request_fails', async () => {
    // Arrange
    mockGet.mockRejectedValueOnce({
      code: 'NOT_FOUND',
      message: 'Kullanıcı bulunamadı.',
    });

    // Act
    render(
      <ProfileModal isOpen={true} onClose={vi.fn()} username="bilinmeyen" />,
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Kullanıcı bulunamadı.',
      );
    });
    expect(
      screen.getByRole('button', { name: 'Tekrar Dene' }),
    ).toBeInTheDocument();
  });
});
