import { StateCreator } from 'zustand';
import type { AppStore } from './index';

export interface HardwareSliceState {
  connected: boolean;
  mock: boolean;
  port: string;
  baudRate: number;
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  lastEvent: {
    event: string;
    data: unknown;
    timestamp: number;
  } | null;
}

export interface HardwareSliceActions {
  setHardwareStatus: (status: Partial<HardwareSliceState>) => void;
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  setLastEvent: (event: string, data: unknown) => void;
  resetHardware: () => void;
}

export type HardwareSlice = HardwareSliceState & HardwareSliceActions;

export const initialHardwareState: HardwareSliceState = {
  connected: false,
  mock: false,
  port: 'COM3',
  baudRate: 9600,
  wsStatus: 'disconnected',
  lastEvent: null,
};

export const createHardwareSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  HardwareSlice
> = (set) => ({
  ...initialHardwareState,
  setHardwareStatus: (status) =>
    set((state) => ({ ...state, ...status }), false, 'hardware/setStatus'),
  setWsStatus: (status) =>
    set((state) => ({ ...state, wsStatus: status }), false, 'hardware/setWsStatus'),
  setLastEvent: (event, data) =>
    set(
      (state) => ({
        ...state,
        lastEvent: { event, data, timestamp: Date.now() },
      }),
      false,
      'hardware/setLastEvent'
    ),
  resetHardware: () =>
    set((state) => ({ ...state, ...initialHardwareState }), false, 'hardware/resetHardware'),
});
