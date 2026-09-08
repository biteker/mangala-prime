import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import { GameEndReason } from '@mangala/shared';
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
import { processLocalMove } from '../lib/game-engine';

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
  isLocalPvP: boolean;

  connectGame: (matchId: string) => void;
  disconnectGame: () => void;
  makeMove: (pitIndex: number) => void;
  reconnectGame: () => void;
  toggleChat: (enabled: boolean) => void;
  sendChatMessage: (message: string, type: 'text' | 'preset') => void;
  setMatchDetails: (details: { opponentUsername: string; opponentElo: number; yourColor: Player }) => void;
  abandonGame: () => void;
  startLocalGame: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

const runTimer = (
  seconds: number,
  set: (partial: Partial<GameState>) => void,
  get: () => GameState
): void => {
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

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  matchId: null,
  board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
  currentPlayerId: null,
  turnTimeLeft: 59,
  opponentUsername: null,
  opponentElo: null,
  yourColor: null,
  chatEnabled: true,
  messages: [],
  gameError: null,
  gameOverDetails: null,
  disconnectedPlayerId: null,
  reconnectWindowSecs: null,
  isLocalPvP: false,

  connectGame: (matchId: string) => {
    const state = get();
    // Socket varsa ve aynı maç için kurulduysa (bağlanıyor olsa bile) tekrar oluşturma
    if (state.socket && state.matchId === matchId) {
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

    const socketUrl = typeof window !== 'undefined'
      ? (window.location.port === '5173'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : window.location.origin)
      : 'http://127.0.0.1:3000';

    const newSocket = io(`${socketUrl}/game`, {
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

    // Soket (yeniden) bağlandığında mevcut oda durumunu sunucudan talep et
    newSocket.on('connect', () => {
      const currentState = get();
      if (currentState.matchId) {
        newSocket.emit('game:reconnect', { matchId: currentState.matchId });
      }
    });

    const startClientTimer = (seconds: number): void => {
      runTimer(seconds, set, get);
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
      const currentState = get();
      set({
        board: payload.board,
        currentPlayerId: payload.nextPlayerId,
        opponentUsername: payload.opponentUsername,
        // yourColor sunucudan geliyorsa güncelle, yoksa mevcut değeri koru
        yourColor: payload.yourColor !== undefined ? payload.yourColor : currentState.yourColor,
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
      turnTimeLeft: 59,
      opponentUsername: null,
      opponentElo: null,
      yourColor: null,
      chatEnabled: true,
      messages: [],
      gameError: null,
      gameOverDetails: null,
      disconnectedPlayerId: null,
      reconnectWindowSecs: null,
      isLocalPvP: false,
    });
  },

  startLocalGame: () => {
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
      isLocalPvP: true,
      matchId: 'local-match',
      board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
      currentPlayerId: 'p1',
      turnTimeLeft: 59,
      opponentUsername: '2. Oyuncu (Misafir)',
      opponentElo: 1000,
      yourColor: 0,
      chatEnabled: false,
      messages: [],
      gameError: null,
      gameOverDetails: null,
      disconnectedPlayerId: null,
      reconnectWindowSecs: null,
    });
    runTimer(59, set, get);
  },

  makeMove: (pitIndex: number) => {
    const state = get();
    if (state.isLocalPvP) {
      const currentPlayer: Player = state.currentPlayerId === 'p2' ? 1 : 0;
      try {
        const result = processLocalMove(state.board, pitIndex, currentPlayer);
        if (result.gameOver) {
          set({
            board: result.newBoard,
            currentPlayerId: null,
            gameOverDetails: {
              matchId: 'local-match',
              winnerId: result.winner === 0 ? 'p1' : (result.winner === 1 ? 'p2' : undefined),
              reason: GameEndReason.NORMAL,
              p1EloChange: 0,
              p2EloChange: 0,
              finalBoard: result.newBoard,
            },
          });
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
        } else {
          const nextPlayerId = result.nextPlayer === 0 ? 'p1' : 'p2';
          set({
            board: result.newBoard,
            currentPlayerId: nextPlayerId,
            gameError: null,
          });
          runTimer(59, set, get);
        }
      } catch (err: unknown) {
        set({ gameError: err instanceof Error ? err.message : 'Geçersiz hamle.' });
      }
      return;
    }

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

  abandonGame: () => {
    const { socket, matchId } = get();
    if (socket && socket.connected && matchId) {
      socket.emit('game:abandon', { matchId });
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
    // Player 1 (yourColor=0) başlar, Player 2 (yourColor=1) bekler
    const nextPlayerId = details.yourColor === 0 ? (user?.id ?? null) : null;
    set({
      opponentUsername: details.opponentUsername,
      opponentElo: details.opponentElo,
      yourColor: details.yourColor,
      currentPlayerId: nextPlayerId,
    });
  },
}));
