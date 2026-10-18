import { StateCreator } from 'zustand';
import type { AppStore } from './index';

/**
 * Perfil recordado en el dispositivo para reconexion sin contraseña.
 * Conserva identidad y economia del jugador entre sesiones; la tarjeta
 * RFID fisica se re-verifica en cada vinculo (2 fases IR -> RFID).
 */
export interface SavedProfile {
  userId: number;
  username: string;
  avatarId: string;
  saldoPuntos: number;
  rfidUid: string | null;
}

export interface UserSliceState {
  userId: number | null;
  username: string | null;
  avatarId: string;
  saldoPuntos: number;
  pinTemporal: string | null;
  rfidUid: string | null;
  /** true cuando el perfil esta vinculado y verificado con la estacion fisica. */
  isPaired: boolean;
  /** Cuentas registradas en este telefono/tableta (persistidas). */
  savedProfiles: SavedProfile[];
}

export interface UserSliceActions {
  setUser: (user: Partial<UserSliceState>) => void;
  updateSaldo: (delta: number) => void;
  setSaldoPuntos: (saldo: number) => void;
  setPinTemporal: (pin: string | null) => void;
  /** Activa un perfil guardado como sesion actual (aun requiere verificacion RFID). */
  adoptSavedProfile: (profile: SavedProfile) => void;
  /** Guarda/actualiza la sesion actual dentro de savedProfiles (upsert por userId). */
  persistCurrentProfile: () => void;
  /** Desconecta la sesion activa conservando savedProfiles en el dispositivo. */
  disconnectCurrentUser: () => void;
  clearUser: () => void;
}

export type UserSlice = UserSliceState & UserSliceActions;

export const initialUserState: UserSliceState = {
  userId: null,
  username: null,
  avatarId: 'led_red_happy',
  saldoPuntos: 0,
  pinTemporal: null,
  rfidUid: null,
  isPaired: false,
  savedProfiles: [],
};

export const createUserSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  UserSlice
> = (set) => ({
  ...initialUserState,
  setUser: (userData) =>
    set((state) => ({ ...state, ...userData }), false, 'user/setUser'),
  updateSaldo: (delta) =>
    set(
      (state) => ({ ...state, saldoPuntos: Math.max(0, state.saldoPuntos + delta) }),
      false,
      'user/updateSaldo'
    ),
  setSaldoPuntos: (saldo) =>
    set(
      (state) => ({ ...state, saldoPuntos: Math.max(0, saldo) }),
      false,
      'user/setSaldoPuntos'
    ),
  setPinTemporal: (pin) =>
    set((state) => ({ ...state, pinTemporal: pin }), false, 'user/setPinTemporal'),

  adoptSavedProfile: (profile) =>
    set(
      (state) => ({
        ...state,
        userId: profile.userId,
        username: profile.username,
        avatarId: profile.avatarId,
        saldoPuntos: profile.saldoPuntos,
        rfidUid: profile.rfidUid,
        isPaired: false,
      }),
      false,
      'user/adoptSavedProfile'
    ),

  persistCurrentProfile: () =>
    set(
      (state) => {
        if (state.userId === null || !state.username) return state;
        const entry: SavedProfile = {
          userId: state.userId,
          username: state.username,
          avatarId: state.avatarId,
          saldoPuntos: state.saldoPuntos,
          rfidUid: state.rfidUid,
        };
        const others = state.savedProfiles.filter((p) => p.userId !== entry.userId);
        return { ...state, savedProfiles: [entry, ...others].slice(0, 8) };
      },
      false,
      'user/persistCurrentProfile'
    ),

  /**
   * Reinicio tipado de la sesion activa: limpia identidad, saldo en memoria
   * y estado de vinculacion, pero conserva las cuentas guardadas en el
   * dispositivo para permitir reconexion sin contraseña.
   */
  disconnectCurrentUser: () =>
    set(
      (state) => ({
        ...initialUserState,
        savedProfiles: state.savedProfiles,
      }),
      false,
      'user/disconnectCurrentUser'
    ),

  clearUser: () =>
    set(
      (state) => ({
        ...initialUserState,
        savedProfiles: state.savedProfiles,
      }),
      false,
      'user/clearUser'
    ),
});
