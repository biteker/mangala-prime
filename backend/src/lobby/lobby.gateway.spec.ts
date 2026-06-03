import { Test, TestingModule } from '@nestjs/testing';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';

describe('LobbyGateway', () => {
  let gateway: LobbyGateway;
  let lobbyService: LobbyService;
  let jwtService: JwtService;

  const mockLobbyService = {
    setServer: jest.fn(),
    addUser: jest.fn(),
    removeUser: jest.fn(),
    joinQueue: jest.fn(),
    leaveQueue: jest.fn(),
    sendInvite: jest.fn(),
    handleInviteResponse: jest.fn(),
    getOnlineUser: jest.fn(),
    getPlayerElo: jest.fn(),
    getOnlineUsers: jest.fn().mockReturnValue([]),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyGateway,
        { provide: LobbyService, useValue: mockLobbyService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<LobbyGateway>(LobbyGateway);
    lobbyService = module.get<LobbyService>(LobbyService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    let mockSocket: any;
    let mockServer: any;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-p1',
        handshake: {
          auth: { token: 'valid-token' },
          query: {},
          address: '192.168.1.100',
        },
        data: {},
        disconnect: jest.fn(),
        emit: jest.fn(),
        broadcast: {
          emit: jest.fn(),
        },
      };
      mockServer = {
        emit: jest.fn(),
      };
      gateway.server = mockServer as unknown as Server;
    });

    it('should_authorize_and_connect_successfully_with_valid_token', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: 'user1' });
      mockLobbyService.getPlayerElo.mockResolvedValue(1050);

      // Act
      await gateway.handleConnection(mockSocket as unknown as Socket);

      // Assert
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', expect.any(Object));
      expect(mockSocket.data).toEqual({ userId: 'user-1', username: 'user1', ip: '192.168.1.100' });
      expect(lobbyService.addUser).toHaveBeenCalledWith('user-1', 'user1', 'socket-p1', '192.168.1.100');
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('lobby:user_status', {
        userId: 'user-1',
        status: 'lobby',
        username: 'user1',
        elo: 1050,
      });
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should_disconnect_if_token_is_missing', async () => {
      // Arrange
      mockSocket.handshake.auth = {};

      // Act
      await gateway.handleConnection(mockSocket as unknown as Socket);

      // Assert
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should_broadcast_offline_status_on_disconnect', async () => {
      // Arrange
      const mockSocket = {
        id: 'socket-p1',
      } as unknown as Socket;

      mockLobbyService.removeUser.mockResolvedValue('user-1');

      const mockServer = {
        emit: jest.fn(),
      };
      gateway.server = mockServer as unknown as Server;

      // Act
      await gateway.handleDisconnect(mockSocket);

      // Assert
      expect(lobbyService.removeUser).toHaveBeenCalledWith('socket-p1');
      expect(mockServer.emit).toHaveBeenCalledWith('lobby:user_status', { userId: 'user-1', status: 'offline' });
    });
  });

  describe('handleQueueJoin', () => {
    let mockSocket: any;
    let mockServer: any;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-p1',
        data: { userId: 'user-1', username: 'user1', ip: '192.168.1.100' },
        emit: jest.fn(),
      };
      mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      gateway.server = mockServer as unknown as Server;
    });

    it('should_emit_error_if_join_queue_fails', async () => {
      // Arrange
      mockLobbyService.joinQueue.mockResolvedValue({
        success: false,
        error: { code: 'DUPLICATE_FINGERPRINT', message: 'Aynı cihaz.' },
      });

      // Act
      await gateway.handleQueueJoin(mockSocket as unknown as Socket);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('lobby:error', {
        error: { code: 'DUPLICATE_FINGERPRINT', message: 'Aynı cihaz.' },
      });
    });

    it('should_emit_match_found_to_both_players_on_successful_matching', async () => {
      // Arrange
      mockLobbyService.joinQueue.mockResolvedValue({
        success: true,
        matchDetails: {
          matchId: 'match-123',
          player1: { userId: 'user-1', socketId: 'socket-p1', username: 'user1' },
          player2: { userId: 'user-2', socketId: 'socket-p2', username: 'user2' },
          isFriendly: false,
        },
      });

      mockLobbyService.getOnlineUser.mockReturnValueOnce({}).mockReturnValueOnce({});
      mockLobbyService.getPlayerElo.mockResolvedValueOnce(1200).mockResolvedValueOnce(1100);

      // Act
      await gateway.handleQueueJoin(mockSocket as unknown as Socket);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith('socket-p1');
      expect(mockServer.to).toHaveBeenCalledWith('socket-p2');
      expect(mockServer.emit).toHaveBeenCalledWith('game:match_found', {
        matchId: 'match-123',
        opponentUsername: 'user2',
        opponentElo: 1100,
        yourColor: 0,
      });
      expect(mockServer.emit).toHaveBeenCalledWith('game:match_found', {
        matchId: 'match-123',
        opponentUsername: 'user1',
        opponentElo: 1200,
        yourColor: 1,
      });
    });
  });

  describe('handleInviteSend', () => {
    let mockSocket: any;
    let mockServer: any;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-p1',
        data: { userId: 'user-1', username: 'user1' },
        emit: jest.fn(),
      };
      mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      gateway.server = mockServer as unknown as Server;
    });

    it('should_emit_error_if_invite_payload_validation_fails', async () => {
      // Arrange
      const invalidPayload = { targetUserId: 'invalid-id' }; // Not a UUID

      // Act
      await gateway.handleInviteSend(mockSocket as unknown as Socket, invalidPayload as any);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('lobby:error', expect.objectContaining({
        error: { code: 'INVALID_PARAMS', message: 'Geçersiz davet parametreleri.' },
      }));
    });

    it('should_forward_invite_to_target_player_on_success', async () => {
      // Arrange
      const payload = { targetUserId: '550e8400-e29b-41d4-a716-446655440000' };
      mockLobbyService.sendInvite.mockResolvedValue(true);
      mockLobbyService.getOnlineUser.mockReturnValue({ socketId: 'socket-p2' });

      // Act
      await gateway.handleInviteSend(mockSocket as unknown as Socket, payload);

      // Assert
      expect(lobbyService.sendInvite).toHaveBeenCalledWith('user-1', payload.targetUserId);
      expect(mockServer.to).toHaveBeenCalledWith('socket-p2');
      expect(mockServer.emit).toHaveBeenCalledWith('lobby:invite_send', { inviterUserId: 'user-1' });
    });
  });

  describe('handleInviteResponse', () => {
    let mockSocket: any;
    let mockServer: any;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-p2',
        data: { userId: 'user-2', username: 'user2' },
        emit: jest.fn(),
      };
      mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      gateway.server = mockServer as unknown as Server;
    });

    it('should_notify_both_players_on_invite_acceptance', async () => {
      // Arrange
      const payload = { inviterUserId: 'user-1', accepted: true };
      mockLobbyService.handleInviteResponse.mockResolvedValue({
        matchId: 'match-123',
        player1: { userId: 'user-1', socketId: 'socket-p1', username: 'user1' },
        player2: { userId: 'user-2', socketId: 'socket-p2', username: 'user2' },
      });
      mockLobbyService.getPlayerElo.mockResolvedValueOnce(1200).mockResolvedValueOnce(1100);

      // Act
      await gateway.handleInviteResponse(mockSocket as unknown as Socket, payload);

      // Assert
      expect(lobbyService.handleInviteResponse).toHaveBeenCalledWith('user-1', 'user-2', true);
      expect(mockServer.to).toHaveBeenCalledWith('socket-p1');
      expect(mockServer.to).toHaveBeenCalledWith('socket-p2');
      expect(mockServer.emit).toHaveBeenCalledWith('game:match_found', {
        matchId: 'match-123',
        opponentUsername: 'user2',
        opponentElo: 1100,
        yourColor: 0,
      });
      expect(mockServer.emit).toHaveBeenCalledWith('game:match_found', {
        matchId: 'match-123',
        opponentUsername: 'user1',
        opponentElo: 1200,
        yourColor: 1,
      });
    });

    it('should_notify_inviter_on_invite_rejection', async () => {
      // Arrange
      const payload = { inviterUserId: 'user-1', accepted: false };
      mockLobbyService.handleInviteResponse.mockResolvedValue({});
      mockLobbyService.getOnlineUser.mockReturnValue({ socketId: 'socket-p1' });

      // Act
      await gateway.handleInviteResponse(mockSocket as unknown as Socket, payload);

      // Assert
      expect(lobbyService.handleInviteResponse).toHaveBeenCalledWith('user-1', 'user-2', false);
      expect(mockServer.to).toHaveBeenCalledWith('socket-p1');
      expect(mockServer.emit).toHaveBeenCalledWith('lobby:invite_response', {
        targetUserId: 'user-2',
        accepted: false,
      });
    });
  });
});
