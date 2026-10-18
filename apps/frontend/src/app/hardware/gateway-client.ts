/**
 * KINESTEM - Cliente del Gateway de Hardware (WebSocket + Serial)
 *
 * Integra el frontend con el flujo real de la estación física:
 *  - Sensor IR (pulsos de dígitos del control remoto)
 *  - Lector RFID-RC522 (tramas `RFID:<uid>` que disparan el evento AUTH_LINKED)
 *  - LCD 16x2 I2C y Matriz LED 8x8 (espejados como feedback visual)
 *  - Servo SG90 (comando DISPENSE de la caja misteriosa, tras verificar RFID)
 *
 * La lógica de dominio vive en funciones módulo-level que leen el store
 * con `getState()`, de modo que el WebSocket real y la simulación de
 * demostración (sin Arduino) recorren exactamente el mismo camino.
 */
import type { ClientWebSocketMessage, ServerWebSocketMessage, MatchDto } from '@kinestem/shared-types';
import { useAppStore } from '../../store';
import type { MatchParticipantLite } from '../../store/match.slice';

const store = () => useAppStore.getState();

const jsonHeaders = { 'Content-Type': 'application/json' };

/* ------------------------------------------------------------------ */
/* Utilidades de traduccion backend -> estado de partida                */
/* ------------------------------------------------------------------ */

/** Proyecta un MatchParticipantDto (con rfid_uid opcional) al estado ligero. */
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

/** Sincroniza los participantes de la partida activa desde el backend. */
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

/**
 * Registra un perfil nuevo (sin contraseña) y lo fija como sesion actual.
 * Con backend caido opera en modo local con un id de respaldo.
 */
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
 * Valida los 4 dígitos capturados por IR contra el PIN de la sesión.
 * Refleja el veredicto que la consola muestra en la LCD 16x2 y la
 * matriz LED 8x8 (carita feliz / cara confundida).
 */
export function validateIrPinDigits(): void {
  const s = store();
  if (s.pairingPhase !== 'WAITING_IR_CODE') return;
  if (s.irDigits.length !== 4) return;
  const entered = s.irDigits.join('');
  s.setIrCodeStatus(entered === s.pairingPin ? 'correct' : 'incorrect');
}

/** Confirma el PIN aceptado hacia el gateway (LCD: "PIN RECIBIDO | ESPERANDO TAG"). */
export function announcePinAcceptedToGateway(): void {
  const { pairingPin } = store();
  if (pairingPin) {
    sendGatewayCommand({ type: 'SUBMIT_PIN', pin: pairingPin });
  }
}

/* ------------------------------------------------------------------ */
/* Bus de lecturas RFID (para la confirmacion del ganador de la ruleta)*/
/* ------------------------------------------------------------------ */

type RfidReadListener = (uid: string) => void;
const rfidReadListeners = new Set<RfidReadListener>();

/** Suscribe un oyente a cada lectura RFID de la estacion. */
export function subscribeRfidReads(listener: RfidReadListener): () => void {
  rfidReadListeners.add(listener);
  return () => {
    rfidReadListeners.delete(listener);
  };
}

function notifyRfidListeners(uid: string): void {
  rfidReadListeners.forEach((listener) => listener(uid));
}

/* ------------------------------------------------------------------ */
/* FASE 2: Escaneo RFID + bloqueo anti-duplicados + vinculo backend    */
/* ------------------------------------------------------------------ */

/**
 * Procesa una lectura RFID (evento `RFID:<uid>` del serial o AUTH_LINKED).
 * 1. Notifica a los oyentes (confirmacion del ganador de la ruleta).
 * 2. En Fase 2 de vinculacion: vincula la tarjeta (el backend reasigna la
 *    tarjeta activa), admite al jugador en la partida activa validando
 *    anti-duplicados y activa la sesion sin contraseña.
 */
export async function processRfidUid(uid: string): Promise<void> {
  notifyRfidListeners(uid);

  const s = store();
  // La Fase 2 solo esta habilitada tras "Codigo correcto" en la Fase 1
  if (s.pairingPhase !== 'WAITING_RFID_SCAN' && s.pairingPhase !== 'RFID_DUPLICATED') return;

  const current = useAppStore.getState();
  const username = current.username ?? `JUGADOR ${uid.slice(-2).toUpperCase()}`;
  let userId = current.userId;

  // 1) Alta del usuario nuevo (cuentas sin contraseña)
  if (userId === null) {
    userId = await registerNewUser(username, current.avatarId);
  }

  // 2) Vinculo tarjeta + admision a la partida activa (anti-duplicados en BD)
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
    // Duplicado en la partida activa: rechazo inmediato con banner explicito
    if (linkMessage.includes('ya está registrada') || linkMessage.includes('ya esta registrada')) {
      store().rejectDuplicatedRfid(uid);
      return;
    }
    // PIN invalido u otro error de validacion: se reintenta el flujo
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

  // 3) Respaldo sin backend: admision local anti-duplicados
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

/** Dispara la señal de dispensación física hacia el Servo SG90. */
export function sendDispenseCommand(): boolean {
  return sendGatewayCommand({ type: 'DISPENSE_TEST' });
}

/* ------------------------------------------------------------------ */
/* Dispatcher de mensajes del gateway                                  */
/* ------------------------------------------------------------------ */

function extractIrDigit(event: string, data: unknown): string | undefined {
  // Tramas compatibles: IR:5 | IR_KEY {key:"5"} | RAW "IR:5" | BTN:* (pulso sin dígito)
  const raw = typeof data === 'string' ? data : '';
  const irMatch = raw.match(/^IR:(\d)$/i) ?? event.match(/^IR:?(\d)$/i);
  if (irMatch?.[1]) return irMatch[1];
  if (typeof data === 'object' && data !== null && 'key' in data) {
    const key = String((data as { key: unknown }).key);
    if (/^\d$/.test(key)) return key;
  }
  return undefined;
}

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
      // El gateway confirma el PIN aceptado; solo abre sesión si no hay una activa
      if (useAppStore.getState().pairingPhase === 'IDLE' && msg.pin) {
        s.startPairingSession(msg.pin);
      }
      break;
    }

    case 'AUTH_LINKED': {
      s.setLastEvent('AUTH_LINKED', msg.uid);
      void processRfidUid(String(msg.uid));
      break;
    }

    case 'HARDWARE_EVENT': {
      s.setLastEvent(msg.event, msg.data);
      if (msg.event === 'RFID') {
        void processRfidUid(String(msg.data));
      } else if (msg.event.startsWith('IR') || (msg.event === 'RAW' && String(msg.data).startsWith('IR:'))) {
        s.registerIrPulse(extractIrDigit(msg.event, msg.data));
        if (useAppStore.getState().irDigits.length === 4) {
          validateIrPinDigits();
        }
      } else if (msg.event.startsWith('BTN:')) {
        s.registerIrPulse(undefined);
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
    } catch {
      // Tramas no-JSON ignoradas silenciosamente
    }
  };

  socket.onopen = () => {
    useAppStore.getState().setWsStatus('connected');
    sendGatewayCommand({ type: 'GET_STATUS' });
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

/** Abre (o mantiene) la conexión con el gateway de hardware. */
export function acquireHardwareGateway(): void {
  refCount += 1;
  connect();
}

/** Libera la conexión cuando el último consumidor desmonta. */
export function releaseHardwareGateway(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
    useAppStore.getState().setWsStatus('disconnected');
  }
}

/* ------------------------------------------------------------------ */
/* Simuladores de demostración (sin Arduino conectado)                 */
/* ------------------------------------------------------------------ */

/** Simula una tecla del Control Remoto IR. */
export function simulateIrKey(digit: string): void {
  const s = store();
  s.registerIrPulse(digit);
  if (useAppStore.getState().irDigits.length === 4) {
    validateIrPinDigits();
  }
}

/** Simula el envío del PIN con resultado forzado (verificación rápida). */
export function simulateIrSubmit(force: 'correct' | 'incorrect'): void {
  store().setIrCodeStatus(force);
}

/** Simula la lectura de una tarjeta/llavero en el RC522. */
export function simulateRfidScan(uid: string): void {
  store().setLastEvent('RFID', uid);
  void processRfidUid(uid);
}

/**
 * Emite una lectura RFID de demostracion SOLO al bus de oyentes
 * (p. ej. confirmacion del ganador de la ruleta), sin atravesar el
 * flujo de emparejamiento de la estacion.
 */
export function simulateRfidRead(uid: string): void {
  store().setLastEvent('RFID_DEMO', uid);
  notifyRfidListeners(uid);
}
