import { StateCreator } from 'zustand';
import type { AppStore } from './index';

export interface UserSliceState {
  userId: number | null;
  username: string | null;
  saldoPuntos: number;
  pinTemporal: string | null;
  avatarUrl: string | null;
}

export interface UserSliceActions {
  setUser: (user: Partial<UserSliceState>) => void;
  updateSaldo: (delta: number) => void;
  setPinTemporal: (pin: string | null) => void;
  clearUser: () => void;
}

export type UserSlice = UserSliceState & UserSliceActions;

export const initialUserState: UserSliceState = {
  userId: null,
  username: null,
  saldoPuntos: 0,
  pinTemporal: null,
  avatarUrl: null,
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
  setPinTemporal: (pin) =>
    set((state) => ({ ...state, pinTemporal: pin }), false, 'user/setPinTemporal'),
  clearUser: () =>
    set((state) => ({ ...state, ...initialUserState }), false, 'user/clearUser'),
});
