import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import { GameEndReason } from '@mangala/shared';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: GameService;
  let jwtService: JwtService;

  const mockGameService = {
    setServer: jest.fn(),
    handlePlayerConnect: jest.fn(),
    handlePlayerDisconnect: jest.fn(),
    handleReconnect: jest.fn(),
    validateMove: jest.fn(),
    processMove: jest.fn(),
    toggleChat: jest.fn(),
    getRoom: jest.fn(),
    getRoomForUser: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: GameService, useValue: mockGameService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get<GameService>(GameService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    let mockSocket: any;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-p1',
        handshake: {
          auth: { token: 'valid-token' },
          query: {},
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    it('should_authorize_and_connect_successfully_with_valid_token', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: 'user1' });
      mockGameService.getRoomForUser.mockReturnValue({ matchId: 'match-123' });

      // Act
      await gateway.handleConnection(mockSocket as unknown as Socket);

      // Assert
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', expect.any(Object));
      expect(mockSocket.data).toEqual({ userId: 'user-1', username: 'user1' });
      expect(gameService.handlePlayerConnect).toHaveBeenCalledWith('user-1', 'socket-p1');
      expect(mockSocket.join).toHaveBeenCalledWith('match-123');
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

    it('should_disconnect_if_token_is_invalid', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act
      await gateway.handleConnection(mockSocket as unknown as Socket);

      // Assert
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should_notify_opponent_on_disconnect', async () => {
      // Arrange
      const mockSocket = {
        id: 'socket-p1',
      } as unknown as Socket;

      mockGameService.handlePlayerDisconnect.mockResolvedValue({
        matchId: 'match-123',
        opponentSocketId: 'socket-p2',
        userId: 'user-1',
      });

      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      gateway.server = mockServer as unknown as Server;

      // Act
      await gateway.handleDisconnect(mockSocket);

      // Assert
      expect(gameService.handlePlayerDisconnect).toHaveBeenCalledWith('socket-p1');
      expect(mockServer.to).toHaveBeenCalledWith('match-123');
      expect(mockServer.emit).toHaveBeenCalledWith('game:player_disconnected', {
        playerId: 'user-1',
        reconnectWindowSecs: 60,
      });
    });
  });

  describe('handleMove', () => {
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

    it('should_emit_error_if_payload_validation_fails', async () => {
      // Arrange
      const invalidPayload = { matchId: '', pitIndex: 100 }; // Invalid matchId (not UUID) and out of bound pitIndex
      mockGameService.getRoom.mockReturnValue({ board: [4, 4, 4] });

      // Act
      await gateway.handleMove(mockSocket as unknown as Socket, invalidPayload as any);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('game:error', expect.objectContaining({
        error: { code: 'INVALID_MOVE', message: 'Geçersiz hamle parametreleri.' },
      }));
    });

    it('should_emit_error_if_move_is_rules_invalid', async () => {
      // Arrange
      const payload = { matchId: '550e8400-e29b-41d4-a716-446655440000', pitIndex: 2 };
      mockGameService.validateMove.mockResolvedValue({ valid: false, reason: 'Sıra sizde değil.' });

      // Act
      await gateway.handleMove(mockSocket as unknown as Socket, payload);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('game:error', {
        error: { code: 'INVALID_MOVE', message: 'Sıra sizde değil.' },
      });
    });

    it('should_broadcast_state_update_on_successful_move', async () => {
      // Arrange
      const payload = { matchId: '550e8400-e29b-41d4-a716-446655440000', pitIndex: 2 };
      mockGameService.validateMove.mockResolvedValue({ valid: true });
      mockGameService.processMove.mockResolvedValue({
        newBoard: [4, 4, 0],
        nextPlayerId: 'user-2',
        gameOver: false,
      });

      // Act
      await gateway.handleMove(mockSocket as unknown as Socket, payload);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(payload.matchId);
      expect(mockServer.emit).toHaveBeenCalledWith('game:state_update', {
        board: [4, 4, 0],
        nextPlayerId: 'user-2',
        turnTimeLeft: 15,
      });
    });

    it('should_broadcast_game_over_when_game_ends', async () => {
      // Arrange
      const payload = { matchId: '550e8400-e29b-41d4-a716-446655440000', pitIndex: 5 };
      mockGameService.validateMove.mockResolvedValue({ valid: true });
      mockGameService.processMove.mockResolvedValue({
        newBoard: [0, 0, 26],
        nextPlayerId: 'user-1',
        gameOver: true,
        winnerId: 'user-1',
        p1EloChange: 15,
        p2EloChange: -15,
      });

      // Act
      await gateway.handleMove(mockSocket as unknown as Socket, payload);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(payload.matchId);
      expect(mockServer.emit).toHaveBeenCalledWith('game:game_over', {
        matchId: payload.matchId,
        winnerId: 'user-1',
        reason: GameEndReason.NORMAL,
        p1EloChange: 15,
        p2EloChange: -15,
        finalBoard: [0, 0, 26],
      });
    });
  });

  describe('handleReconnect', () => {
    it('should_reconnect_successfully_and_emit_ack', async () => {
      // Arrange
      const mockSocket = {
        id: 'socket-p1-new',
        data: { userId: 'user-1', username: 'user1' },
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as Socket;

      mockGameService.handleReconnect.mockResolvedValue({
        matchId: 'match-123',
        player1Id: 'user-1',
        player2Id: 'user-2',
        player1Username: 'user1',
        player2Username: 'user2',
        board: [4, 4, 4],
        currentPlayer: 0,
        turnTimeLeft: 10,
      });

      // Act
      await gateway.handleReconnect(mockSocket, { matchId: 'match-123' });

      // Assert
      expect(gameService.handleReconnect).toHaveBeenCalledWith('user-1', 'match-123', 'socket-p1-new');
      expect(mockSocket.join).toHaveBeenCalledWith('match-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:reconnect_ack', {
        board: [4, 4, 4],
        nextPlayerId: 'user-1',
        turnTimeLeft: 10,
        matchId: 'match-123',
        opponentUsername: 'user2',
        yourColor: 0,
      });
    });
  });

  describe('chat_and_toggle', () => {
    let mockSocket: any;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-p1',
        data: { userId: 'user-1', username: 'user1' },
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
    });

    it('should_forward_chat_toggle_to_opponent', async () => {
      // Act
      await gateway.handleChatToggle(mockSocket as unknown as Socket, {
        matchId: 'match-123',
        chatEnabled: false,
      });

      // Assert
      expect(gameService.toggleChat).toHaveBeenCalledWith('match-123', 'user-1', false);
      expect(mockSocket.to).toHaveBeenCalledWith('match-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:chat_toggle', {
        matchId: 'match-123',
        chatEnabled: false,
      });
    });

    it('should_sanitize_and_forward_chat_message', async () => {
      // Act
      await gateway.handleChatMessage(mockSocket as unknown as Socket, {
        matchId: 'match-123',
        message: '<script>alert("xss")</script>hello',
        type: 'text',
      });

      // Assert
      expect(mockSocket.to).toHaveBeenCalledWith('match-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:message', {
        matchId: 'match-123',
        message: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;hello',
        type: 'text',
      });
    });
  });
});
