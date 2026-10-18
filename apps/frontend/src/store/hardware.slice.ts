import { StateCreator } from 'zustand';
import type { AppStore } from './index';

/**
 * Máquina de estados del emparejamiento con la estación física.
 * Flujo obligatorio en 2 fases:
 *   FASE 1: PIN de 4 dígitos ingresado con el Control Remoto IR  (WAITING_IR_CODE)
 *   FASE 2: Escaneo de tarjeta/llavero RFID en el lector RC522   (WAITING_RFID_SCAN)
 * Nunca se salta directo a RFID: la Fase 2 solo se habilita tras
 * el feedback "Código correcto" del gateway (LCD 16x2 + matriz LED 8x8).
 */
export type PairingPhase =
  | 'IDLE' // Sesión no iniciada
  | 'WAITING_IR_CODE' // FASE 1: esperando dígitos por Control IR
  | 'IR_CODE_CORRECT' // Feedback verde transitorio (carita feliz en matriz LED)
  | 'IR_CODE_INCORRECT' // Feedback rojo transitorio (cara confundida, permite reintento)
  | 'WAITING_RFID_SCAN' // FASE 2: esperando tarjeta/llavero en el RC522
  | 'RFID_DUPLICATED' // Rechazo: rfid_uid ya registrado en la partida activa
  | 'PAIRING_COMPLETE'; // Vinculación confirmada ("Ingreso correcto")

/** Caras de la matriz LED 8x8 reflejadas en la interfaz */
export type LedMatrixFace = 'idle' | 'waiting' | 'happy' | 'confused' | 'error' | 'cheer';

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

  /* --- Emparejamiento 2 fases --- */
  pairingPhase: PairingPhase;
  pairingPin: string | null;
  irDigits: string[]; // Dígitos capturados por el receptor IR
  irPulseAt: number | null; // Timestamp del último pulso IR (parpadeo azul)
  irAttempts: number; // Intentos fallidos de PIN
  rfidUid: string | null; // UID leído en la Fase 2
  duplicateRfidError: string | null; // Banner explícito anti-duplicados

  /* --- Vínculo persistente con la estación --- */
  linked: boolean;
  linkedUsername: string | null;

  /* --- Espejo del hardware (feedback visual) --- */
  lcdMessage: { line1: string; line2: string } | null; // LCD 16x2 I2C
  ledMatrixFace: LedMatrixFace; // Matriz LED 8x8
}

export interface HardwareSliceActions {
  setHardwareStatus: (status: Partial<HardwareSliceState>) => void;
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  setLastEvent: (event: string, data: unknown) => void;
  resetHardware: () => void;

  startPairingSession: (pin: string) => void;
  registerIrPulse: (digit?: string) => void;
  setIrCodeStatus: (status: 'correct' | 'incorrect') => void;
  retryIrCode: () => void;
  beginRfidScanPhase: () => void;
  rejectDuplicatedRfid: (uid: string) => void;
  completePairing: (username?: string, uid?: string) => void;
  resetPairing: () => void;
  setLcdMessage: (line1: string, line2: string) => void;
}

export type HardwareSlice = HardwareSliceState & HardwareSliceActions;

export const initialHardwareState: HardwareSliceState = {
  connected: false,
  mock: false,
  port: 'COM3',
  baudRate: 9600,
  wsStatus: 'disconnected',
  lastEvent: null,
  pairingPhase: 'IDLE',
  pairingPin: null,
  irDigits: [],
  irPulseAt: null,
  irAttempts: 0,
  rfidUid: null,
  duplicateRfidError: null,
  linked: false,
  linkedUsername: null,
  lcdMessage: null,
  ledMatrixFace: 'idle',
};

export const DUPLICATE_RFID_MESSAGE =
  'Esta tarjeta RFID ya está registrada por otro jugador en la partida actual';

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

  /** FASE 1: abre sesión de vinculación con un PIN de 4 dígitos. */
  startPairingSession: (pin) =>
    set(
      (state) => ({
        ...state,
        pairingPhase: 'WAITING_IR_CODE',
        pairingPin: pin,
        irDigits: [],
        irAttempts: 0,
        rfidUid: null,
        duplicateRfidError: null,
        lcdMessage: { line1: `PIN: ${pin}`, line2: 'USA CONTROL IR' },
        ledMatrixFace: 'waiting',
      }),
      false,
      'hardware/startPairingSession'
    ),

  /** Pulso recibido por el sensor IR: parpadeo azul + dígito capturado. */
  registerIrPulse: (digit) =>
    set(
      (state) => {
        const nextDigits =
          typeof digit === 'string' && digit.length === 1 && state.irDigits.length < 4
            ? [...state.irDigits, digit]
            : state.irDigits;
        return {
          ...state,
          irPulseAt: Date.now(),
          irDigits: nextDigits,
        };
      },
      false,
      'hardware/registerIrPulse'
    ),

  /** Veredicto del gateway sobre el PIN digitado por IR. */
  setIrCodeStatus: (status) =>
    set(
      (state) => {
        if (status === 'correct') {
          return {
            ...state,
            pairingPhase: 'IR_CODE_CORRECT',
            lcdMessage: { line1: 'CODIGO CORRECTO', line2: 'ESPERA RFID...' },
            ledMatrixFace: 'happy',
          };
        }
        return {
          ...state,
          pairingPhase: 'IR_CODE_INCORRECT',
          irAttempts: state.irAttempts + 1,
          lcdMessage: { line1: 'CODIGO ERRONEO', line2: 'REINTENTA PIN' },
          ledMatrixFace: 'confused',
        };
      },
      false,
      'hardware/setIrCodeStatus'
    ),

  /** Reinicia la captura del PIN (mantiene el mismo PIN de sesión). */
  retryIrCode: () =>
    set(
      (state) => ({
        ...state,
        pairingPhase: 'WAITING_IR_CODE',
        irDigits: [],
        lcdMessage: { line1: `PIN: ${state.pairingPin ?? '----'}`, line2: 'USA CONTROL IR' },
        ledMatrixFace: 'waiting',
      }),
      false,
      'hardware/retryIrCode'
    ),

  /** Habilita la FASE 2: escaneo RFID en el lector RC522. */
  beginRfidScanPhase: () =>
    set(
      (state) => ({
        ...state,
        pairingPhase: 'WAITING_RFID_SCAN',
        lcdMessage: { line1: 'APROXIMA TARJETA', line2: 'LECTOR RC522' },
        ledMatrixFace: 'waiting',
      }),
      false,
      'hardware/beginRfidScanPhase'
    ),

  /** Rechazo inmediato: rfid_uid duplicado en la partida activa. */
  rejectDuplicatedRfid: (uid) =>
    set(
      (state) => ({
        ...state,
        pairingPhase: 'RFID_DUPLICATED',
        rfidUid: uid,
        duplicateRfidError: DUPLICATE_RFID_MESSAGE,
        lcdMessage: { line1: 'TARJETA YA EN', line2: 'PARTIDA ACTIVA' },
        ledMatrixFace: 'error',
      }),
      false,
      'hardware/rejectDuplicatedRfid'
    ),

  /** "Ingreso correcto": vincula perfil y estación. */
  completePairing: (username, uid) =>
    set(
      (state) => ({
        ...state,
        pairingPhase: 'PAIRING_COMPLETE',
        linked: true,
        linkedUsername: username ?? state.linkedUsername,
        rfidUid: uid ?? state.rfidUid,
        duplicateRfidError: null,
        lcdMessage: { line1: 'INGRESO CORRECTO', line2: 'A JUGAR!' },
        ledMatrixFace: 'cheer',
      }),
      false,
      'hardware/completePairing'
    ),

  resetPairing: () =>
    set(
      (state) => ({
        ...state,
        pairingPhase: 'IDLE',
        pairingPin: null,
        irDigits: [],
        irPulseAt: null,
        irAttempts: 0,
        rfidUid: null,
        duplicateRfidError: null,
        lcdMessage: null,
        ledMatrixFace: 'idle',
      }),
      false,
      'hardware/resetPairing'
    ),

  setLcdMessage: (line1, line2) =>
    set((state) => ({ ...state, lcdMessage: { line1, line2 } }), false, 'hardware/setLcdMessage'),
});
