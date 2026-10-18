/**
 * KINESTEM - Cliente del Gateway de Hardware (WebSocket + Serial)
 *
 * Integra el frontend con el flujo real de la estación física:
 *  - Sensor IR (pulsos de dígitos del control remoto)
 *  - Lector RFID-RC522 (tramas `RFID:<uid>` que disparan el evento AUTH_LINKED)
 *  - LCD 16x2 I2C y Matriz LED 8x8 (espejados como feedback visual)
 *  - Servo SG90 (comando DISPENSE de la caja misteriosa)
 *
 * La lógica de dominio vive en funciones módulo-level que leen el store
 * con `getState()`, de modo que el WebSocket real y la simulación de
 * demostración (sin Arduino) recorren exactamente el mismo camino.
 */
import type { ClientWebSocketMessage, ServerWebSocketMessage, MatchDto } from '@kinestem/shared-types';
import { useAppStore } from '../../store';
import type { MatchParticipantLite } from '../../store/match.slice';

const store = () => useAppStore.getState();

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
/* FASE 1: PIN vía Control Remoto IR                                   */
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
/* FASE 2: Escaneo RFID + bloqueo anti-duplicados                      */
/* ------------------------------------------------------------------ */

/**
 * Procesa una lectura RFID (evento `RFID:<uid>` del serial o AUTH_LINKED).
 * Antes de admitir al jugador en la partida activa verifica en el estado
 * de la partida (match.slice) que el rfid_uid no esté ya registrado:
 * si está duplicado lo rechaza de inmediato con el banner de error.
 */
export function processRfidUid(uid: string): void {
  const s = store();
  // La Fase 2 solo está habilitada tras "Código correcto" en la Fase 1
  if (s.pairingPhase !== 'WAITING_RFID_SCAN' && s.pairingPhase !== 'RFID_DUPLICATED') return;

  const candidateName = s.username ?? s.linkedUsername ?? `JUGADOR ${uid.slice(-2).toUpperCase()}`;
  const result = s.admitParticipant({ username: candidateName, rfidUid: uid });

  if (!result.ok && result.reason === 'DUPLICATED_RFID') {
    s.rejectDuplicatedRfid(uid);
    return;
  }

  // "Ingreso correcto": vincula perfil con la estación y persiste el vínculo
  s.completePairing(candidateName, uid);
  s.setUser({ username: candidateName });
  if (s.userId) {
    void fetch('/api/v1/auth/pairing/link-rfid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfid_uid: uid, user_id: s.userId }),
    }).catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ */
/* Dispensador físico (Servo SG90 de la caja misteriosa)               */
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
      processRfidUid(String(msg.uid));
      break;
    }

    case 'HARDWARE_EVENT': {
      s.setLastEvent(msg.event, msg.data);
      if (msg.event === 'RFID') {
        processRfidUid(String(msg.data));
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
        estadoPartida: msg.match.status === 'in_progress' ? 'in_progress' : msg.match.status === 'lobby' ? 'lobby' : 'finished',
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
  processRfidUid(uid);
}
