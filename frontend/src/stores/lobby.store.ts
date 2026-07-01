import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import type {
  LobbyUserStatusPayload,
  LobbyInviteTimeoutPayload,
  LobbyQueueTimeoutPayload,
  LobbyErrorPayload,
  GameMatchFoundPayload,
} from '@mangala/shared';

export interface OnlineUser {
  userId: string;
  username: string;
  status: 'lobby' | 'playing' | 'offline';
  elo: number;
}

interface LobbyState {
  socket: Socket | null;
  onlineUsers: OnlineUser[];
  isInQueue: boolean;
  incomingInvite: { inviterUserId: string } | null;
  outgoingInviteTargetId: string | null;
  inviteError: LobbyErrorPayload['error'] | null;
  
  connectLobby: () => void;
  disconnectLobby: () => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  sendInvite: (targetUserId: string) => void;
  respondToInvite: (inviterUserId: string, accepted: boolean) => void;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  isInQueue: false,
  incomingInvite: null,
  outgoingInviteTargetId: null,
  inviteError: null,

  connectLobby: () => {
    const state = get();
    if (state.socket && state.socket.connected) {
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      return;
    }

    if (state.socket) {
      state.socket.disconnect();
    }

    const socketUrl = typeof window !== 'undefined'
      ? (window.location.port === '5173'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : window.location.origin)
      : 'http://127.0.0.1:3000';

    const newSocket = io(`${socketUrl}/lobby`, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('lobby:init_users', (users: OnlineUser[]) => {
      set({ onlineUsers: users });
    });

    newSocket.on('lobby:user_status', (payload: LobbyUserStatusPayload) => {
      set((currentState) => {
        const users = [...currentState.onlineUsers];
        const existingIndex = users.findIndex((u) => u.userId === payload.userId);

        if (existingIndex > -1) {
          if (payload.status === 'offline') {
            users.splice(existingIndex, 1);
          } else {
            users[existingIndex] = {
              ...users[existingIndex],
              status: payload.status,
              username: payload.username || users[existingIndex].username,
              elo: payload.elo !== undefined ? payload.elo : users[existingIndex].elo,
            };
          }
        } else if (payload.status !== 'offline') {
          users.push({
            userId: payload.userId,
            username: payload.username || `User_${payload.userId.substring(0, 4)}`,
            status: payload.status,
            elo: payload.elo || 1000,
          });
        }
        return { onlineUsers: users };
      });
    });

    newSocket.on('lobby:invite_send', (payload: { inviterUserId: string }) => {
      set({ incomingInvite: { inviterUserId: payload.inviterUserId } });
    });

    newSocket.on('lobby:invite_response', (payload: unknown) => {
      const response = payload as { targetUserId: string; accepted: boolean };
      if (!response.accepted) {
        set({ outgoingInviteTargetId: null });
      }
    });

    newSocket.on('lobby:invite_timeout', (payload: LobbyInviteTimeoutPayload) => {
      const currentInvite = get().incomingInvite;
      if (currentInvite && currentInvite.inviterUserId === payload.inviterUserId) {
        set({ incomingInvite: null });
      }
    });

    newSocket.on('lobby:queue_timeout', (_payload: LobbyQueueTimeoutPayload) => {
      set({ isInQueue: false });
    });

    newSocket.on('lobby:error', (payload: LobbyErrorPayload) => {
      set({ inviteError: payload.error, outgoingInviteTargetId: null });
    });

    newSocket.on('game:match_found', async (payload: GameMatchFoundPayload) => {
      set({ isInQueue: false, incomingInvite: null, outgoingInviteTargetId: null });
      const { useGameStore } = await import('./game.store');
      useGameStore.getState().setMatchDetails({
        opponentUsername: payload.opponentUsername,
        opponentElo: payload.opponentElo,
        yourColor: payload.yourColor,
      });
      useGameStore.getState().connectGame(payload.matchId);
      window.location.hash = '#/game';
    });

    set({ socket: newSocket });
  },

  disconnectLobby: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      onlineUsers: [],
      isInQueue: false,
      incomingInvite: null,
      outgoingInviteTargetId: null,
      inviteError: null,
    });
  },

  joinQueue: () => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('lobby:queue_join');
      set({ isInQueue: true, inviteError: null });
    }
  },

  leaveQueue: () => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('lobby:queue_leave');
      set({ isInQueue: false });
    }
  },

  sendInvite: (targetUserId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('lobby:invite_send', { targetUserId });
      set({ outgoingInviteTargetId: targetUserId, inviteError: null });
    }
  },

  respondToInvite: (inviterUserId: string, accepted: boolean) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('lobby:invite_response', { inviterUserId, accepted });
      set({ incomingInvite: null });
    }
  },
}));
