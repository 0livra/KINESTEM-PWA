import { StateCreator } from 'zustand';
import type { AppStore } from './index';

export interface MatchSliceState {
  matchId: number | null;
  codigoSala: string | null;
  ronda: number;
  vidasRestantes: number;
  eliminado: boolean;
  puntuacion: number;
  estadoPartida: 'idle' | 'lobby' | 'in_progress' | 'finished';
}

export interface MatchSliceActions {
  setMatch: (matchData: Partial<MatchSliceState>) => void;
  decrementLives: () => void;
  advanceRound: () => void;
  resetMatch: () => void;
}

export type MatchSlice = MatchSliceState & MatchSliceActions;

export const initialMatchState: MatchSliceState = {
  matchId: null,
  codigoSala: null,
  ronda: 1,
  vidasRestantes: 3,
  eliminado: false,
  puntuacion: 0,
  estadoPartida: 'idle',
};

export const createMatchSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  MatchSlice
> = (set) => ({
  ...initialMatchState,
  setMatch: (matchData) =>
    set((state) => ({ ...state, ...matchData }), false, 'match/setMatch'),
  decrementLives: () =>
    set(
      (state) => {
        const nextLives = Math.max(0, state.vidasRestantes - 1);
        return {
          ...state,
          vidasRestantes: nextLives,
          eliminado: nextLives === 0,
        };
      },
      false,
      'match/decrementLives'
    ),
  advanceRound: () =>
    set((state) => ({ ...state, ronda: state.ronda + 1 }), false, 'match/advanceRound'),
  resetMatch: () =>
    set((state) => ({ ...state, ...initialMatchState }), false, 'match/resetMatch'),
});
