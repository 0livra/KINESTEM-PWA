import { StateCreator } from 'zustand';
import type { AppStore } from './index';

/**
 * Participante de la partida activa (proyección ligera de
 * MatchParticipantDto, extendida con el rfid_uid para la
 * validación anti-duplicados en la admisión a la sala).
 */
export interface MatchParticipantLite {
  userId: number;
  username: string;
  rfidUid: string | null;
  vidasRestantes: number;
  eliminado: boolean;
  puntuacion: number;
}

export interface AdmitParticipantResult {
  ok: boolean;
  reason?: 'DUPLICATED_RFID';
  message?: string;
}

export interface MatchSliceState {
  matchId: number | null;
  codigoSala: string | null;
  ronda: number;
  vidasRestantes: number;
  eliminado: boolean;
  puntuacion: number;
  estadoPartida: 'idle' | 'lobby' | 'in_progress' | 'finished';
  participantes: MatchParticipantLite[];
}

export interface MatchSliceActions {
  setMatch: (matchData: Partial<MatchSliceState>) => void;
  setParticipantes: (participantes: MatchParticipantLite[]) => void;
  /**
   * Anti-duplicados: admite un jugador a la partida activa solo si su
   * rfid_uid no está ya registrado entre los participantes actuales.
   */
  admitParticipant: (candidate: {
    userId?: number;
    username: string;
    rfidUid: string;
  }) => AdmitParticipantResult;
  removeParticipant: (rfidUid: string) => void;
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
  participantes: [],
};

export const createMatchSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  MatchSlice
> = (set, get) => ({
  ...initialMatchState,
  setMatch: (matchData) =>
    set((state) => ({ ...state, ...matchData }), false, 'match/setMatch'),
  setParticipantes: (participantes) =>
    set((state) => ({ ...state, participantes }), false, 'match/setParticipantes'),
  admitParticipant: (candidate) => {
    const { participantes } = get();
    // Validación en el estado de la partida: el mismo rfid_uid no puede
    // ocupar dos asientos en la partida activa (match_id actual).
    const duplicated = participantes.some((p) => p.rfidUid === candidate.rfidUid);
    if (duplicated) {
      return {
        ok: false,
        reason: 'DUPLICATED_RFID',
        message: 'Esta tarjeta RFID ya está registrada por otro jugador en la partida actual',
      };
    }
    set(
      (state) => ({
        ...state,
        participantes: [
          ...state.participantes,
          {
            userId: candidate.userId ?? state.participantes.length + 1,
            username: candidate.username,
            rfidUid: candidate.rfidUid,
            vidasRestantes: state.vidasRestantes || 3,
            eliminado: false,
            puntuacion: 0,
          },
        ],
      }),
      false,
      'match/admitParticipant'
    );
    return { ok: true };
  },
  removeParticipant: (rfidUid) =>
    set(
      (state) => ({
        ...state,
        participantes: state.participantes.filter((p) => p.rfidUid !== rfidUid),
      }),
      false,
      'match/removeParticipant'
    ),
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
