import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type {
  MyActiveTournamentStatusResponse,
  TournamentMatchAssignedPayload,
  TournamentStatus,
  TournamentStatusChangedPayload,
  TournamentUpdatedPayload,
} from '@mangala/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from './auth.store';
import { useGameStore } from './game.store';
import { useLobbyStore } from './lobby.store';

const getSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.port === '5173'
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin;
  }
  return 'http://127.0.0.1:3000';
};

const EMPTY_ACTIVE_STATUS: MyActiveTournamentStatusResponse = {
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
};

interface TournamentState {
  socket: Socket | null;
  isConnected: boolean;
  watchedTournamentId: string | null;
  lastUpdateEvent: TournamentUpdatedPayload | null;
  updateCounter: number;
  hasActiveTournamentMatch: boolean;
  isLockedInTournament: boolean;
  activeTournamentId: string | null;
  activeTournamentName: string | null;
  activeTournamentStatus: TournamentStatus | null;
  currentRound: number | null;
  totalRounds: number | null;
  activeMatchId: string | null;
  activeSetNumber: number | null;
  setsPerMatch: number | null;
  opponentUsername: string | null;

  connectTournament: () => void;
  disconnectTournament: () => void;
  watchTournament: (tournamentId: string) => void;
  unwatchTournament: (tournamentId: string) => void;
  refreshMyActiveStatus: () => Promise<void>;
  enterActiveMatch: () => void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  socket: null,
  isConnected: false,
  watchedTournamentId: null,
  lastUpdateEvent: null,
  updateCounter: 0,
  ...EMPTY_ACTIVE_STATUS,

  connectTournament: () => {
    const state = get();
    if (state.socket && (state.socket.connected || state.socket.active)) {
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      return;
    }

    if (state.socket) {
      state.socket.disconnect();
    }

    const newSocket = io(`${getSocketUrl()}/tournament`, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      set({ isConnected: true });
      const watchedId = get().watchedTournamentId;
      if (watchedId) {
        newSocket.emit('tournament:watch', { tournamentId: watchedId });
      }
      void get().refreshMyActiveStatus();
    });

    newSocket.on('disconnect', () => {
      set({ isConnected: false });
    });

    newSocket.on('tournament:updated', (payload: TournamentUpdatedPayload) => {
      set((currentState) => ({
        lastUpdateEvent: payload,
        updateCounter: currentState.updateCounter + 1,
      }));
      void get().refreshMyActiveStatus();
    });

    newSocket.on(
      'tournament:status_changed',
      (payload: TournamentStatusChangedPayload) => {
        set((currentState) => ({
          lastUpdateEvent: payload,
          updateCounter: currentState.updateCounter + 1,
        }));
        void get().refreshMyActiveStatus();
      },
    );

    newSocket.on(
      'tournament:match_assigned',
      (payload: TournamentMatchAssignedPayload) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'activeTournamentId',
            payload.tournamentId,
          );
        }

        set({
          hasActiveTournamentMatch: true,
          isLockedInTournament: true,
          activeTournamentId: payload.tournamentId,
          activeTournamentStatus: 'IN_PROGRESS',
          currentRound: payload.round,
          activeMatchId: payload.matchId,
          activeSetNumber: payload.setNumber,
          setsPerMatch: payload.setsPerMatch,
          opponentUsername: payload.opponentUsername,
        });

        const gameState = useGameStore.getState();

        // Zaten bu maçtaysa tekrar başlatma
        if (gameState.matchId === payload.matchId) {
          void get().refreshMyActiveStatus();
          return;
        }

        // Oyuncu 1. set bitiş ekranındaysa 2. set modal akışını besle, oyunu zorla kesme
        if (
          payload.setNumber > 1 &&
          gameState.tournamentId === payload.tournamentId &&
          gameState.matchId !== null &&
          gameState.matchId !== payload.matchId
        ) {
          useGameStore.setState({
            nextTournamentMatchId: payload.matchId,
            tournamentId: payload.tournamentId,
            tournamentSetsPerMatch: payload.setsPerMatch,
          });
          void get().refreshMyActiveStatus();
          return;
        }

        useLobbyStore.getState().leaveQueue();
        useGameStore.getState().connectGame(payload.matchId);
        useGameStore.setState({
          opponentUsername: payload.opponentUsername,
          opponentElo: null,
          yourColor: null,
          tournamentId: payload.tournamentId,
          tournamentSetNumber: payload.setNumber,
          tournamentSetsPerMatch: payload.setsPerMatch,
          nextTournamentMatchId: null,
        });

        if (typeof window !== 'undefined') {
          window.location.hash = '#/game';
        }
        void get().refreshMyActiveStatus();
      },
    );

    set({ socket: newSocket });
  },

  disconnectTournament: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      isConnected: false,
      watchedTournamentId: null,
      lastUpdateEvent: null,
      updateCounter: 0,
      ...EMPTY_ACTIVE_STATUS,
    });
  },

  watchTournament: (tournamentId: string) => {
    const prevId = get().watchedTournamentId;
    const socket = get().socket;
    if (prevId && prevId !== tournamentId && socket?.connected) {
      socket.emit('tournament:unwatch', { tournamentId: prevId });
    }
    set({ watchedTournamentId: tournamentId });
    if (socket?.connected) {
      socket.emit('tournament:watch', { tournamentId });
    }
  },

  unwatchTournament: (tournamentId: string) => {
    const { socket, watchedTournamentId } = get();
    if (socket?.connected) {
      socket.emit('tournament:unwatch', { tournamentId });
    }
    if (watchedTournamentId === tournamentId) {
      set({ watchedTournamentId: null });
    }
  },

  refreshMyActiveStatus: async () => {
    try {
      const status = await apiClient.get<never, MyActiveTournamentStatusResponse>(
        '/tournaments/my-active-status',
      );
      if (status.activeTournamentId && typeof window !== 'undefined') {
        window.localStorage.setItem(
          'activeTournamentId',
          status.activeTournamentId,
        );
      }
      set({
        hasActiveTournamentMatch: status.hasActiveTournamentMatch,
        isLockedInTournament: status.isLockedInTournament,
        activeTournamentId: status.activeTournamentId,
        activeTournamentName: status.activeTournamentName,
        activeTournamentStatus: status.activeTournamentStatus,
        currentRound: status.currentRound,
        totalRounds: status.totalRounds,
        activeMatchId: status.activeMatchId,
        activeSetNumber: status.activeSetNumber,
        setsPerMatch: status.setsPerMatch,
        opponentUsername: status.opponentUsername,
      });
    } catch {
      // Sessizce yoksay
    }
  },

  enterActiveMatch: () => {
    const state = get();
    if (!state.activeMatchId) {
      return;
    }

    useLobbyStore.getState().leaveQueue();
    useGameStore.getState().connectGame(state.activeMatchId);
    useGameStore.setState({
      opponentUsername: state.opponentUsername,
      opponentElo: null,
      yourColor: null,
      tournamentId: state.activeTournamentId,
      tournamentSetNumber: state.activeSetNumber ?? 1,
      tournamentSetsPerMatch: state.setsPerMatch,
      nextTournamentMatchId: null,
    });

    if (typeof window !== 'undefined') {
      window.location.hash = '#/game';
    }
  },
}));
