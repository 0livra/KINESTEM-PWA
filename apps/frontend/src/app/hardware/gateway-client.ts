import type { ClientWebSocketMessage, ServerWebSocketMessage, MatchDto, StationMode } from '@kinestem/shared-types';
import { useAppStore } from '../../store';
import type { MatchParticipantLite } from '../../store/match.slice';
import type { LedMatrixFace } from '../../store/hardware.slice';

const store = () => useAppStore.getState();

const jsonHeaders = { 'Content-Type': 'application/json' };

/* ------------------------------------------------------------------ */
/* Utilidades de traduccion backend -> estado de partida                */
/* ------------------------------------------------------------------ */

function toParticipantLite(raw: Record<string, unknown>): MatchParticipantLite {
  return {
    userId: Number(raw['user_id'] ?? raw['userId'] ?? 0),
    username: String(raw['username'] ?? 'Jugador'),
    rfidUid:
      typeof raw['rfid_uid'] === 'string'
        ? raw['rfid_uid']
        : typeof raw['rfidUid'] === 'string'
          ? raw['rfidUid']
          : null,
    vidasRestantes: Number(raw['vidas_restantes'] ?? raw['vidasRestantes'] ?? 3),
    eliminado: Boolean(raw['eliminado'] ?? false),
    puntuacion: Number(raw['puntuacion_acumulada'] ?? raw['puntuacion'] ?? 0),
  };
}

export function syncMatchParticipants(match: MatchDto | Record<string, unknown> | null | undefined): void {
  if (!match) return;
  const rawList =
    (match as { participantes?: unknown }).participantes ??
    (match as { data?: { participantes?: unknown } }).data?.participantes ??
    [];
  if (!Array.isArray(rawList)) return;
  store().setParticipantes(rawList.map((r) => toParticipantLite(r as Record<string, unknown>)));
}

/* ------------------------------------------------------------------ */
/* Cuentas sin contraseña (registro local con respaldo del backend)    */
/* ------------------------------------------------------------------ */

export async function registerNewUser(username: string, avatarId: string): Promise<number> {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ username, avatarId }),
  })
    .then((r) => r.json())
    .catch(() => null);

  if (res?.data?.userId) {
    store().setUser({
      userId: Number(res.data.userId),
      username: String(res.data.username ?? username),
      avatarId: String(res.data.avatarId ?? avatarId),
      saldoPuntos: Number(res.data.saldoPuntos ?? 0),
    });
    return Number(res.data.userId);
  }

  const fallbackId = Math.floor(1000 + Math.random() * 9000);
  store().setUser({ userId: fallbackId, username, avatarId });
  return fallbackId;
}

/* ------------------------------------------------------------------ */
/* FASE 1: PIN via Control Remoto IR                                   */
/* ------------------------------------------------------------------ */

/**
 * El hardware Maestro es ahora el encargado de validar los dígitos IR.
 * Esta función se mantiene vacía para no romper referencias externas.
 */
export function validateIrPinDigits(): void {
  // Validación de PIN transferida 100% al hardware C++
}

/**
 * Cambia la fase del Arduino Maestro (`MODE:<modo>`). El lector RC522 solo lee una
 * tarjeta por armado, así que cada espera de RFID debe enviar 'RFID' de nuevo.
 * No reenviar SUBMIT_PIN tras STATUS:PIN_OK: SET_PIN regresa el firmware a la fase PIN.
 */
export function sendStationMode(mode: StationMode): boolean {
  return sendGatewayCommand({ type: 'SET_MODE', mode });
}

/* ------------------------------------------------------------------ */
/* Bus de lecturas RFID (para la confirmacion del ganador de la ruleta)*/
/* ------------------------------------------------------------------ */

type RfidReadListener = (uid: string) => void;
const rfidReadListeners = new Set<RfidReadListener>();

export function subscribeRfidReads(listener: RfidReadListener): () => void {
  rfidReadListeners.add(listener);
  return () => {
    rfidReadListeners.delete(listener);
  };
}

function notifyRfidListeners(uid: string): void {
  rfidReadListeners.forEach((listener) => listener(uid));
}

type HardwareEventListener = (event: string, data: unknown) => void;
const hardwareEventListeners = new Set<HardwareEventListener>();

export function subscribeHardwareEvents(listener: HardwareEventListener): () => void {
  hardwareEventListeners.add(listener);
  return () => {
    hardwareEventListeners.delete(listener);
  };
}

function notifyHardwareEventListeners(event: string, data: unknown): void {
  hardwareEventListeners.forEach((listener) => listener(event, data));
}

/* ------------------------------------------------------------------ */
/* FASE 2: Escaneo RFID + bloqueo anti-duplicados + vinculo backend    */
/* ------------------------------------------------------------------ */

let rfidLinkInFlight = false;

export async function processRfidUid(uid: string): Promise<void> {
  notifyRfidListeners(uid);

  const s = store();
  if (s.pairingPhase !== 'WAITING_RFID_SCAN' && s.pairingPhase !== 'RFID_DUPLICATED') return;
  if (rfidLinkInFlight) return;
  rfidLinkInFlight = true;
  try {
    await linkScannedRfid(uid);
  } finally {
    rfidLinkInFlight = false;
  }
}

async function linkScannedRfid(uid: string): Promise<void> {
  const current = useAppStore.getState();
  const username = current.username ?? `JUGADOR ${uid.slice(-2).toUpperCase()}`;
  let userId = current.userId;

  if (userId === null) {
    userId = await registerNewUser(username, current.avatarId);
  }

  const linkPayload: Record<string, unknown> = {
    pinTemporal: current.pairingPin,
    rfidUid: uid,
  };
  if (current.matchId) linkPayload['matchId'] = current.matchId;

  const link = await fetch('/api/v1/auth/pairing/link-rfid', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(linkPayload),
  })
    .then((r) => r.json())
    .catch(() => null);

  const linkMessage = String(link?.message ?? link?.error ?? '');

  if (link && link.success === false) {
    if (linkMessage.includes('ya está registrada') || linkMessage.includes('ya esta registrada')) {
      store().rejectDuplicatedRfid(uid);
      return;
    }
    store().setLastEvent('LINK_ERROR', linkMessage);
  }

  if (link?.success && link?.data) {
    store().setUser({
      userId: Number(link.data.userId ?? userId),
      username: String(link.data.username ?? username),
      avatarId: String(link.data.avatarId ?? current.avatarId),
      saldoPuntos: Number(link.data.saldoPuntos ?? current.saldoPuntos),
      rfidUid: uid,
      isPaired: true,
    });
    store().completePairing(String(link.data.username ?? username), uid);
    store().persistCurrentProfile();
    return;
  }

  const candidateName = useAppStore.getState().username ?? username;
  const result = useAppStore.getState().admitParticipant({ username: candidateName, rfidUid: uid });
  if (!result.ok && result.reason === 'DUPLICATED_RFID') {
    store().rejectDuplicatedRfid(uid);
    return;
  }
  store().completePairing(candidateName, uid);
  store().setUser({ username: candidateName, rfidUid: uid, isPaired: true });
  store().persistCurrentProfile();
}

/* ------------------------------------------------------------------ */
/* Dispensador fisico (Servo SG90 de la caja misteriosa)               */
/* ------------------------------------------------------------------ */

export function sendDispenseCommand(): boolean {
  return sendGatewayCommand({ type: 'DISPENSE_TEST' });
}

export function sendLcdCommand(line1: string, line2 = ''): boolean {
  return sendGatewayCommand({ type: 'SET_LCD', line1, line2 });
}

export function sendFaceCommand(face: string): boolean {
  return sendGatewayCommand({ type: 'SET_FACE', face });
}

/** Caras de la UI -> comando FACE del Maestro (el firmware no define 'idle'). */
const PHYSICAL_FACE: Record<LedMatrixFace, string> = {
  idle: 'waiting',
  waiting: 'waiting',
  happy: 'happy',
  confused: 'confused',
  error: 'error',
  cheer: 'cheer',
};

let unsubscribeMatrixMirror: (() => void) | null = null;

/**
 * Refleja ledMatrixFace del store en la matriz 8x8 del Arduino Esclavo
 * (FACE:<cara> -> Maestro -> I2C 0x08), incluso cuando la fase avanza solo en la web.
 */
function installLedMatrixMirror(): void {
  if (unsubscribeMatrixMirror) return;
  unsubscribeMatrixMirror = useAppStore.subscribe((state, prev) => {
    if (state.ledMatrixFace !== prev.ledMatrixFace) {
      sendFaceCommand(PHYSICAL_FACE[state.ledMatrixFace]);
    }
  });
}

export function sendRgbCommand(r: number, g: number, b: number): boolean {
  return sendGatewayCommand({ type: 'SET_RGB', r, g, b });
}

/* ------------------------------------------------------------------ */
/* Dispatcher de mensajes del gateway                                  */
/* ------------------------------------------------------------------ */

export function handleGatewayMessage(msg: ServerWebSocketMessage): void {
  const s = store();
  switch (msg.type) {
    case 'CONNECTED':
    case 'STATUS': {
      s.setWsStatus('connected');
      s.setHardwareStatus({
        connected: msg.serial.connected,
        mock: msg.serial.mock,
        port: msg.serial.port,
        baudRate: msg.serial.baudRate,
      });
      break;
    }

    case 'AUTH_WAITING': {
      if (useAppStore.getState().pairingPhase === 'IDLE' && msg.pin) {
        s.startPairingSession(msg.pin);
      }
      break;
    }

    case 'AUTH_LINKED': {
      // El gateway emite AUTH_LINKED junto con HARDWARE_EVENT RFID para la misma trama;
      // la vinculación se procesa una sola vez desde HARDWARE_EVENT.
      s.setLastEvent('AUTH_LINKED', msg.uid);
      break;
    }

    case 'HARDWARE_EVENT': {
      s.setLastEvent(msg.event, msg.data);
      notifyHardwareEventListeners(msg.event, msg.data);
      if (msg.event === 'RFID') {
        void processRfidUid(String(msg.data).trim());
      } else if (msg.event === 'IR_DIGIT') {
        s.registerIrPulse(String(msg.data));
      } else if (msg.event === 'IR_DETECTED') {
        s.registerIrPulse();
      } else if (msg.event === 'PIN_VALIDATED') {
        s.setIrCodeStatus('correct');
      } else if (msg.event === 'PIN_ERROR') {
        s.setIrCodeStatus('incorrect');
      }
      break;
    }

    case 'MATCH_STATE_SYNC': {
      syncMatchParticipants(msg.match);
      s.setMatch({
        matchId: msg.match.id,
        codigoSala: msg.match.codigo_sala,
        estadoPartida:
          msg.match.status === 'in_progress'
            ? 'in_progress'
            : msg.match.status === 'lobby'
              ? 'lobby'
              : 'finished',
        ronda: msg.match.ronda_actual,
      });
      break;
    }

    case 'SYSTEM_EVENT': {
      if (msg.event === 'serial:connected') {
        s.setHardwareStatus({ connected: true });
      } else if (msg.event === 'serial:disconnected') {
        s.setHardwareStatus({ connected: false });
      }
      break;
    }

    case 'COMMAND_ACK': {
      s.setLastEvent('COMMAND_ACK', msg.command);
      break;
    }

    case 'ERROR': {
      s.setLastEvent('ERROR', msg.error);
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Conexión WebSocket (singleton, montada una vez desde root)          */
/* ------------------------------------------------------------------ */

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let refCount = 0;

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

export function sendGatewayCommand(msg: ClientWebSocketMessage): boolean {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
    return true;
  }
  return false;
}

function connect(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  useAppStore.getState().setWsStatus('connecting');
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    useAppStore.getState().setWsStatus('disconnected');
    scheduleReconnect();
    return;
  }

  socket.onmessage = (ev: MessageEvent) => {
    try {
      handleGatewayMessage(JSON.parse(String(ev.data)) as ServerWebSocketMessage);
    } catch { }
  };

  socket.onopen = () => {
    const s = useAppStore.getState();
    s.setWsStatus('connected');
    sendGatewayCommand({ type: 'GET_STATUS' });
    // Reconexión WS (p. ej. reinicio del backend): resincroniza la fase activa del Maestro
    if ((s.pairingPhase === 'WAITING_IR_CODE' || s.pairingPhase === 'IR_CODE_INCORRECT') && s.pairingPin) {
      sendGatewayCommand({ type: 'SUBMIT_PIN', pin: s.pairingPin });
    } else if (s.pairingPhase === 'WAITING_RFID_SCAN' || s.pairingPhase === 'RFID_DUPLICATED') {
      sendStationMode('RFID');
    }
  };

  socket.onclose = () => {
    useAppStore.getState().setWsStatus('disconnected');
    scheduleReconnect();
  };

  socket.onerror = () => {
    useAppStore.getState().setWsStatus('disconnected');
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (refCount > 0) connect();
  }, 3000);
}

export function acquireHardwareGateway(): void {
  refCount += 1;
  installLedMatrixMirror();
  connect();
}

export function releaseHardwareGateway(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
    unsubscribeMatrixMirror?.();
    unsubscribeMatrixMirror = null;
    useAppStore.getState().setWsStatus('disconnected');
  }
}

/* ------------------------------------------------------------------ */
/* Teclado de la laptop como control IR                                */
/* ------------------------------------------------------------------ */

const KEYBOARD_GAME_PATHS = ['/lobby', '/arena'];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function keyboardDigitsActive(): boolean {
  const { pairingPhase } = store();
  if (pairingPhase === 'WAITING_IR_CODE' || pairingPhase === 'IR_CODE_INCORRECT') return true;
  return KEYBOARD_GAME_PATHS.includes(window.location.pathname);
}

/**
 * Dígito ingresado desde la web (teclado o recuadro de captura). Se captura y valida en
 * la web sin esperar eco del firmware; la LCD física solo refleja el progreso.
 */
export function submitManualDigit(digit: string): void {
  if (!/^\d$/.test(digit)) return;
  const s = store();
  s.setLastEvent('IR_DIGIT', digit);
  s.registerIrPulse(digit);
  notifyHardwareEventListeners('IR_DIGIT', digit);

  const after = store();
  if (after.pairingPhase !== 'WAITING_IR_CODE') return;
  if (after.irDigits.length === 4) {
    after.setIrCodeStatus(after.irDigits.join('') === after.pairingPin ? 'correct' : 'incorrect');
  } else {
    sendLcdCommand(`PIN: ${after.pairingPin ?? '----'}`, '*'.repeat(after.irDigits.length));
  }
}

export function installKeyboardDigitBridge(): () => void {
  const onKeyDown = (ev: KeyboardEvent) => {
    if (!/^\d$/.test(ev.key) || ev.repeat || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (isEditableTarget(ev.target) || !keyboardDigitsActive()) return;
    ev.preventDefault();
    submitManualDigit(ev.key);
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}

/* ------------------------------------------------------------------ */
/* Simuladores de demostración (sin Arduino conectado)                 */
/* ------------------------------------------------------------------ */

export function simulateIrKey(digit: string): void {
  const s = store();
  s.registerIrPulse(digit);
}

export function simulateIrSubmit(force: 'correct' | 'incorrect'): void {
  store().setIrCodeStatus(force);
}

export function simulateRfidScan(uid: string): void {
  store().setLastEvent('RFID', uid);
  void processRfidUid(uid);
}

export function simulateRfidRead(uid: string): void {
  store().setLastEvent('RFID_DEMO', uid);
  notifyRfidListeners(uid);
}