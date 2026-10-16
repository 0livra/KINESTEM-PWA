import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { UserSlice, createUserSlice, initialUserState, UserSliceState } from './user.slice';
import { MatchSlice, createMatchSlice, initialMatchState, MatchSliceState } from './match.slice';
import { HardwareSlice, createHardwareSlice, initialHardwareState, HardwareSliceState } from './hardware.slice';

export type AppStore = UserSlice & MatchSlice & HardwareSlice;

export type AppStoreState = UserSliceState & MatchSliceState & HardwareSliceState;

export const initialStoreState: AppStoreState = {
  ...initialUserState,
  ...initialMatchState,
  ...initialHardwareState,
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createMatchSlice(...a),
        ...createHardwareSlice(...a),
      }),
      {
        name: 'kinestem-store',
        partialize: (state) => ({
          userId: state.userId,
          username: state.username,
          saldoPuntos: state.saldoPuntos,
          pinTemporal: state.pinTemporal,
        }),
      }
    ),
    { name: 'KINESTEM_GLOBAL_STORE' }
  )
);

// Tipo extraído para inspección estricta de estado
export type ExtractState<S> = S extends { getState: () => infer T } ? T : never;
export type AppState = ExtractState<typeof useAppStore>;

/**
 * Función de reseteo completo tipada con el estado inicial consolidado
 */
export const resetStore = (customState?: Partial<typeof initialStoreState>): void => {
  useAppStore.setState({
    ...initialStoreState,
    ...customState,
  });
};

/**
 * Hook selector envuelto en useShallow para el slice de usuario
 */
export function useUserStore<U>(selector: (state: UserSlice) => U): U {
  return useAppStore(useShallow(selector));
}

/**
 * Hook selector envuelto en useShallow para el slice de partida
 */
export function useMatchStore<U>(selector: (state: MatchSlice) => U): U {
  return useAppStore(useShallow(selector));
}

/**
 * Hook selector envuelto en useShallow para el slice de hardware
 */
export function useHardwareStore<U>(selector: (state: HardwareSlice) => U): U {
  return useAppStore(useShallow(selector));
}
