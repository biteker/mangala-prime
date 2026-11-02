import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import { GameEndReason, applyMove, createInitialBoard } from '@mangala/shared';
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
  GameRematchOfferedPayload,
  GameRematchDeclinedPayload,
  GameRematchStartPayload,
} from '@mangala/shared';
import { chooseBotMove, type BotLevel } from '../lib/bot-engine';

export type GameMode = 'online' | 'local' | 'bot';
export type RematchStatus =
  | 'idle'
  | 'offered_by_me'
  | 'offered_by_opponent'
  | 'declined';

export interface ChatMessage {
  sender: 'me' | 'opponent';
  message: string;
  type: 'text' | 'preset';
}

export interface LastOfflineMoveInfo {
  pitIndex: number;
  stoneCount: number;
  player: Player;
  extraTurn: boolean;
  capturedPits?: number[];
  nextBoard: BoardState;
  seq: number;
}

export const getBotMoveDelayMs = (
  stonesSown: number,
  hasCapture: boolean,
): number => {
  const sowAnimationMs = 600 + Math.max(1, stonesSown) * 160;
  const captureAnimationMs = hasCapture ? 500 : 0;
  const thinkingPauseMs = 500;
  return sowAnimationMs + captureAnimationMs + thinkingPauseMs;
};

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
  mode: GameMode;
  botLevel: BotLevel;
  lastMoveInfo: LastOfflineMoveInfo | null;
  rematchState: RematchStatus;
  rematchExpiresAt: number | null;

  connectGame: (matchId: string) => void;
  disconnectGame: () => void;
  makeMove: (pitIndex: number) => void;
  reconnectGame: () => void;
  toggleChat: (enabled: boolean) => void;
  sendChatMessage: (message: string, type: 'text' | 'preset') => void;
  setMatchDetails: (details: { opponentUsername: string; opponentElo: number; yourColor: Player }) => void;
  abandonGame: () => void;
  startLocalGame: () => void;
  startBotGame: (level: BotLevel) => void;
  offerRematch: () => void;
  respondRematch: (accept: boolean) => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;
let botMoveTimeout: ReturnType<typeof setTimeout> | null = null;

const clearTimers = (): void => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (botMoveTimeout) {
    clearTimeout(botMoveTimeout);
    botMoveTimeout = null;
  }
};

const getBotDisplayInfo = (level: BotLevel): { name: string; elo: number } => {
  switch (level) {
    case 'easy':
      return { name: '🤖 Yapay Zeka (Kolay)', elo: 800 };
    case 'medium':
      return { name: '🤖 Yapay Zeka (Orta)', elo: 1200 };
    case 'hard':
      return { name: '🤖 Yapay Zeka (Zor)', elo: 1600 };
  }
};

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
  mode: 'online',
  botLevel: 'medium',
  lastMoveInfo: null,
  rematchState: 'idle',
  rematchExpiresAt: null,

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

    clearTimers();

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
      mode: 'online',
      isLocalPvP: false,
      board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
      gameError: null,
      gameOverDetails: null,
      disconnectedPlayerId: null,
      reconnectWindowSecs: null,
      lastMoveInfo: null,
      rematchState: 'idle',
      rematchExpiresAt: null,
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

    newSocket.on('game:rematch_offered', (payload: GameRematchOfferedPayload) => {
      set({
        rematchState: 'offered_by_opponent',
        rematchExpiresAt: payload.expiresAt,
      });
    });

    newSocket.on('game:rematch_declined', (payload: GameRematchDeclinedPayload) => {
      if (get().matchId && payload.matchId !== get().matchId) return;
      set({
        rematchState: 'declined',
        rematchExpiresAt: null,
      });
    });

    newSocket.on('game:rematch_start', (payload: GameRematchStartPayload) => {
      const currentState = get();
      const swappedColor: Player = currentState.yourColor === 0 ? 1 : 0;
      const user = useAuthStore.getState().user;
      set({
        matchId: payload.newMatchId,
        board: createInitialBoard(),
        yourColor: swappedColor,
        currentPlayerId: swappedColor === 0 ? (user?.id ?? null) : null,
        gameOverDetails: null,
        gameError: null,
        lastMoveInfo: null,
        rematchState: 'idle',
        rematchExpiresAt: null,
      });
      newSocket.emit('game:reconnect', { matchId: payload.newMatchId });
    });

    set({ socket: newSocket });
  },

  disconnectGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    clearTimers();
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
      mode: 'online',
      lastMoveInfo: null,
      rematchState: 'idle',
      rematchExpiresAt: null,
    });
  },

  startLocalGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    clearTimers();
    set({
      socket: null,
      mode: 'local',
      isLocalPvP: true,
      matchId: 'local-match',
      board: createInitialBoard(),
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
      lastMoveInfo: null,
      rematchState: 'idle',
      rematchExpiresAt: null,
    });
    runTimer(59, set, get);
  },

  startBotGame: (level: BotLevel) => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    clearTimers();
    const botInfo = getBotDisplayInfo(level);
    set({
      socket: null,
      mode: 'bot',
      botLevel: level,
      isLocalPvP: true,
      matchId: `bot-match-${level}`,
      board: createInitialBoard(),
      currentPlayerId: 'p1',
      turnTimeLeft: 59,
      opponentUsername: botInfo.name,
      opponentElo: botInfo.elo,
      yourColor: 0,
      chatEnabled: false,
      messages: [],
      gameError: null,
      gameOverDetails: null,
      disconnectedPlayerId: null,
      reconnectWindowSecs: null,
      lastMoveInfo: null,
      rematchState: 'idle',
      rematchExpiresAt: null,
    });
    runTimer(59, set, get);
  },

  makeMove: (pitIndex: number) => {
    const state = get();
    if (state.isLocalPvP || state.mode === 'local' || state.mode === 'bot') {
      if (state.mode === 'bot' && state.currentPlayerId === 'p2') {
        return;
      }

      const applyOfflineMove = (chosenPit: number, player: Player): void => {
        const currentState = get();
        const stoneCount = currentState.board[chosenPit] ?? 0;
        const result = applyMove(currentState.board, chosenPit, player);
        const moveInfo: LastOfflineMoveInfo = {
          pitIndex: chosenPit,
          stoneCount,
          player,
          extraTurn: result.extraTurn,
          capturedPits: result.capturedPits,
          nextBoard: [...result.newBoard],
          seq: (currentState.lastMoveInfo?.seq ?? 0) + 1,
        };

        if (result.gameOver) {
          clearTimers();
          set({
            board: result.newBoard,
            currentPlayerId: null,
            lastMoveInfo: moveInfo,
            gameOverDetails: {
              matchId: currentState.matchId ?? 'local-match',
              winnerId:
                result.winner === 0
                  ? 'p1'
                  : result.winner === 1
                    ? 'p2'
                    : undefined,
              reason: GameEndReason.NORMAL,
              p1EloChange: 0,
              p2EloChange: 0,
              finalBoard: result.newBoard,
            },
          });
          return;
        }

        const nextPlayerId = result.nextPlayer === 0 ? 'p1' : 'p2';
        set({
          board: result.newBoard,
          currentPlayerId: nextPlayerId,
          lastMoveInfo: moveInfo,
          gameError: null,
        });
        runTimer(59, set, get);

        if (currentState.mode === 'bot' && nextPlayerId === 'p2') {
          if (botMoveTimeout) {
            clearTimeout(botMoveTimeout);
          }
          const delayMs = getBotMoveDelayMs(
            stoneCount,
            Boolean(result.capturedPits && result.capturedPits.length > 0),
          );
          botMoveTimeout = setTimeout(() => {
            botMoveTimeout = null;
            const latestState = get();
            if (
              latestState.mode !== 'bot' ||
              latestState.currentPlayerId !== 'p2' ||
              latestState.gameOverDetails
            ) {
              return;
            }
            try {
              const botPit = chooseBotMove(
                latestState.board,
                1,
                latestState.botLevel,
              );
              applyOfflineMove(botPit, 1);
            } catch (botErr: unknown) {
              set({
                gameError:
                  botErr instanceof Error ? botErr.message : 'Bot hamle hatası.',
              });
            }
          }, delayMs);
        }
      };

      const currentPlayer: Player = state.currentPlayerId === 'p2' ? 1 : 0;
      try {
        applyOfflineMove(pitIndex, currentPlayer);
      } catch (err: unknown) {
        set({
          gameError: err instanceof Error ? err.message : 'Geçersiz hamle.',
        });
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
    const { socket, matchId, isLocalPvP } = get();
    if (isLocalPvP) {
      get().disconnectGame();
      return;
    }
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

  offerRematch: () => {
    const state = get();
    if (state.mode === 'bot') {
      state.startBotGame(state.botLevel);
      return;
    }
    if (state.mode === 'local' || state.isLocalPvP) {
      state.startLocalGame();
      return;
    }
    if (state.socket && state.socket.connected && state.matchId) {
      state.socket.emit('game:rematch_offer', { matchId: state.matchId });
      set({
        rematchState: 'offered_by_me',
        rematchExpiresAt: Date.now() + 30_000,
      });
    }
  },

  respondRematch: (accept: boolean) => {
    const { socket, matchId } = get();
    if (socket && socket.connected && matchId) {
      socket.emit('game:rematch_response', { matchId, accept });
      if (!accept) {
        set({
          rematchState: 'declined',
          rematchExpiresAt: null,
        });
      }
    }
  },
}));
