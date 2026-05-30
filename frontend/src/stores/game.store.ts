import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import type {
  BoardState,
  Player,
  GameGameOverPayload,
  GameStateUpdatePayload,
  GamePlayerDisconnectedPayload,
  GameReconnectAckPayload,
  GameMessagePayload,
  GameChatTogglePayload,
  GameErrorPayload,
} from '@mangala/shared';

export interface ChatMessage {
  sender: 'me' | 'opponent';
  message: string;
  type: 'text' | 'preset';
}

interface GameState {
  socket: Socket | null;
  matchId: string | null;
  board: BoardState;
  currentPlayerId: string | null;
  turnTimeLeft: number;
  opponentUsername: string | null;
  opponentElo: number | null;
  yourColor: Player | null;
  chatEnabled: boolean;
  messages: ChatMessage[];
  gameError: string | null;
  gameOverDetails: GameGameOverPayload | null;
  disconnectedPlayerId: string | null;
  reconnectWindowSecs: number | null;

  connectGame: (matchId: string) => void;
  disconnectGame: () => void;
  makeMove: (pitIndex: number) => void;
  reconnectGame: () => void;
  toggleChat: (enabled: boolean) => void;
  sendChatMessage: (message: string, type: 'text' | 'preset') => void;
  setMatchDetails: (details: { opponentUsername: string; opponentElo: number; yourColor: Player }) => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  matchId: null,
  board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
  currentPlayerId: null,
  turnTimeLeft: 15,
  opponentUsername: null,
  opponentElo: null,
  yourColor: null,
  chatEnabled: true,
  messages: [],
  gameError: null,
  gameOverDetails: null,
  disconnectedPlayerId: null,
  reconnectWindowSecs: null,

  connectGame: (matchId: string) => {
    const state = get();
    if (state.socket && state.socket.connected && state.matchId === matchId) {
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      return;
    }

    if (state.socket) {
      state.socket.disconnect();
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    const newSocket = io('http://localhost:3000/game', {
      auth: { token },
      transports: ['websocket'],
    });

    set({
      socket: newSocket,
      matchId,
      board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
      gameError: null,
      gameOverDetails: null,
      disconnectedPlayerId: null,
      reconnectWindowSecs: null,
    });

    const startClientTimer = (seconds: number): void => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      set({ turnTimeLeft: seconds });
      timerInterval = setInterval(() => {
        const current = get().turnTimeLeft;
        if (current > 0) {
          set({ turnTimeLeft: current - 1 });
        } else {
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
        }
      }, 1000);
    };

    newSocket.on('game:state_update', (payload: GameStateUpdatePayload) => {
      set({
        board: payload.board,
        currentPlayerId: payload.nextPlayerId,
        disconnectedPlayerId: null,
        reconnectWindowSecs: null,
      });
      startClientTimer(payload.turnTimeLeft);
    });

    newSocket.on('game:player_disconnected', (payload: GamePlayerDisconnectedPayload) => {
      set({
        disconnectedPlayerId: payload.playerId,
        reconnectWindowSecs: payload.reconnectWindowSecs,
      });
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    });

    newSocket.on('game:reconnect_ack', (payload: GameReconnectAckPayload) => {
      set({
        board: payload.board,
        currentPlayerId: payload.nextPlayerId,
        opponentUsername: payload.opponentUsername,
        disconnectedPlayerId: null,
        reconnectWindowSecs: null,
      });
      startClientTimer(payload.turnTimeLeft);
    });

    newSocket.on('game:game_over', (payload: GameGameOverPayload) => {
      set({
        gameOverDetails: payload,
        board: payload.finalBoard,
        currentPlayerId: null,
      });
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    });

    newSocket.on('game:error', (payload: GameErrorPayload) => {
      set({ gameError: payload.error.message });
      if (payload.board) {
        set({ board: payload.board });
      }
    });

    newSocket.on('game:message', (payload: Omit<GameMessagePayload, 'matchId'>) => {
      set((currentState) => ({
        messages: [
          ...currentState.messages,
          { sender: 'opponent', message: payload.message, type: payload.type },
        ],
      }));
    });

    newSocket.on('game:chat_toggle', (payload: Omit<GameChatTogglePayload, 'matchId'>) => {
      set({ chatEnabled: payload.chatEnabled });
    });

    set({ socket: newSocket });
  },

  disconnectGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({
      socket: null,
      matchId: null,
      board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
      currentPlayerId: null,
      turnTimeLeft: 15,
      opponentUsername: null,
      opponentElo: null,
      yourColor: null,
      chatEnabled: true,
      messages: [],
      gameError: null,
      gameOverDetails: null,
      disconnectedPlayerId: null,
      reconnectWindowSecs: null,
    });
  },

  makeMove: (pitIndex: number) => {
    const { socket, matchId } = get();
    if (socket && socket.connected && matchId) {
      socket.emit('game:move', { matchId, pitIndex });
      set({ gameError: null });
    }
  },

  reconnectGame: () => {
    const { socket, matchId } = get();
    if (socket && socket.connected && matchId) {
      socket.emit('game:reconnect', { matchId });
      set({ gameError: null });
    }
  },

  toggleChat: (enabled: boolean) => {
    const { socket, matchId } = get();
    if (socket && socket.connected && matchId) {
      socket.emit('game:chat_toggle', { matchId, chatEnabled: enabled });
      set({ chatEnabled: enabled });
    }
  },

  sendChatMessage: (message: string, type: 'text' | 'preset') => {
    const { socket, matchId } = get();
    if (socket && socket.connected && matchId) {
      socket.emit('game:message', { matchId, message, type });
      set((currentState) => ({
        messages: [
          ...currentState.messages,
          { sender: 'me', message, type },
        ],
      }));
    }
  },

  setMatchDetails: (details) => {
    const user = useAuthStore.getState().user;
    const nextPlayerId = details.yourColor === 0 ? (user?.id || null) : 'opponent';
    set({
      opponentUsername: details.opponentUsername,
      opponentElo: details.opponentElo,
      yourColor: details.yourColor,
      currentPlayerId: nextPlayerId,
    });
  },
}));
