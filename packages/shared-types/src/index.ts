/**
 * KINESTEM - Contratos DTO, Eventos WebSocket y Enums Compartidos
 * Paquete: @kinestem/shared-types
 */

// ============================================================================
// 1. TELEMETRÍA (MongoDB $jsonSchema Contract)
// ============================================================================

export type TipoResultado = 'EXITO' | 'ERROR_COMPONENTE' | 'TIMEOUT';

export interface AccionFisicaTelemetry {
  componente_esperado?: string;
  componente_utilizado?: string;
  tiempo_reaccion_ms?: number;
  es_secuencia?: boolean;
  precision_secuencia_pct?: number;
}

export interface TelemetryLogEntry {
  _id?: string;
  match_id: number;
  user_id: number;
  estacion_hardware_id?: number;
  ronda: number;
  microjuego_id: string;
  concepto_stem: string;
  dificultad_nivel?: number;
  tiempo_limite_ms: number;
  tipo_resultado: TipoResultado;
  accion_fisica?: AccionFisicaTelemetry | null;
  vidas_restantes: number;
  jugador_eliminado: boolean;
  timestamp: string | Date;
}

export interface TelemetryQueryFilter {
  match_id?: number;
  user_id?: number;
  microjuego_id?: string;
  concepto_stem?: string;
  tipo_resultado?: TipoResultado;
  fecha_inicio?: string;
  fecha_fin?: string;
  limit?: number;
  offset?: number;
}

export interface TelemetryAnalyticsSummary {
  total_intentos: number;
  tasa_exito_pct: number;
  tiempo_reaccion_promedio_ms: number;
  distribucion_errores: Record<TipoResultado, number>;
  conceptos_dominados: string[];
  conceptos_por_reforzar: string[];
}

// ============================================================================
// 2. IDENTIDAD Y CONTROL DE ACCESO RFID (PostgreSQL)
// ============================================================================

export interface UserDto {
  id: number;
  rfid_uid: string | null;
  username: string;
  saldo_puntos: number;
  /** Identificador del avatar LED (ej. 'led_red_happy'); gestionado solo por auth-users. */
  avatar_id: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDto {
  username: string;
  rfid_uid?: string;
  avatar_id?: string;
  pin?: string;
}

export interface LinkSessionDto {
  id: number;
  pin: string;
  device_uid?: string | null;
  user_id?: number | null;
  status: 'pending' | 'completed' | 'expired';
  created_at: string;
  completed_at?: string | null;
}

export interface RequestPinResponseDto {
  success: boolean;
  pin: string;
  expiresInSeconds: number;
  message: string;
}

export interface PairingStatusDto {
  linked: boolean;
  userId?: number;
  username?: string;
  rfidUid?: string;
  deviceUid?: string;
  avatarId?: string;
}

// ============================================================================
// 3. PARTIDAS Y SUPERVIVENCIA (PostgreSQL)
// ============================================================================

export type MatchStatus = 'lobby' | 'in_progress' | 'finished' | 'cancelled';

export interface MatchDto {
  id: number;
  codigo_sala: string;
  status: MatchStatus;
  ronda_actual: number;
  vidas_iniciales: number;
  duracion_segundos: number;
  created_at: string;
  ended_at?: string | null;
  participantes?: MatchParticipantDto[];
}

export interface MatchParticipantDto {
  id: number;
  match_id: number;
  user_id: number;
  username?: string;
  avatar_id?: string;
  avatar_url?: string;
  rfid_uid?: string | null;
  vidas_restantes: number;
  eliminado: boolean;
  puntuacion_acumulada: number;
  puesto_final?: number | null;
}

export interface CreateMatchDto {
  vidas_iniciales?: number;
}

export interface UpdateParticipantScoreDto {
  match_id: number;
  user_id: number;
  delta_puntos: number;
  delta_vidas: number;
  eliminado?: boolean;
}

// ============================================================================
// 4. ECONOMÍA, TIENDA Y RULETA ALGORÍTMICA (PostgreSQL)
// ============================================================================

export interface RewardDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  costo_puntos: number;
  stock: number;
  categoria: string;
  imagen_url?: string | null;
  activo: boolean;
}

export interface RedeemRewardDto {
  reward_id: number;
  user_id: number;
}

export interface RedemptionResultDto {
  success: boolean;
  redemption_id: number;
  nuevo_saldo: number;
  reward_id: number;
  nombre_premio: string;
  timestamp: string;
}

export interface RouletteItemDto {
  id: number;
  titulo: string;
  peso_probabilidad: number;
  tipo_premio: 'puntos' | 'multiplicador' | 'item';
  valor_premio: number;
  color_hex: string;
  activo: boolean;
}

export interface RouletteSpinResultDto {
  spin_id: number;
  item_id: number;
  titulo_premio: string;
  tipo_premio: string;
  valor_premio: number;
  color_hex: string;
  nuevo_saldo: number;
  timestamp: string;
}

// ============================================================================
// 5. HARDWARE GATEWAY, SERIAL Y WEBSOCKETS
// ============================================================================

export type ButtonColor = 'RED' | 'GREEN' | 'BLUE';

export type CircuitComponentType =
  | 'resistor'
  | 'capacitor'
  | 'sensor_ldr'
  | 'led'
  | 'wire';

export interface HardwareStationStatus {
  connected: boolean;
  mock: boolean;
  port: string;
  baudRate: number;
}

export interface DeviceDto {
  id: number;
  uid: string;
  alias?: string | null;
  firmware_version?: string;
  registered_at: string;
  last_seen_at?: string | null;
}

/**
 * Modo operativo del Arduino Maestro (comando serial `MODE:<modo>`).
 *  - PIN:  receptor IR captura el PIN de vinculación (Fase 1)
 *  - RFID: lector RC522 armado para una lectura (Fase 2 / confirmación de premio)
 *  - GAME: receptor IR reenvía cada tecla como `IR:<d>` durante la actividad
 *  - IDLE: sin lecturas activas
 */
export type StationMode = 'PIN' | 'RFID' | 'GAME' | 'IDLE';

export interface HardwareEventPayload {
  event: string;
  data: string | number | Record<string, unknown>;
  timestamp: number;
}

// Eventos de entrada WebSocket (Cliente -> Servidor)
export type ClientWebSocketMessage =
  | { type: 'PING_ARDUINO' }
  | { type: 'DISPENSE_TEST' }
  | { type: 'SUBMIT_PIN'; pin: string }
  | { type: 'SET_LCD'; line1: string; line2?: string }
  | { type: 'SET_FACE'; face: string }
  | { type: 'SET_MODE'; mode: StationMode }
  | { type: 'SET_RGB'; r: number; g: number; b: number }
  /** Dígito tecleado en la web; el Maestro lo procesa igual que una tecla del control IR. */
  | { type: 'KEY_INPUT'; digit: string }
  | { type: 'GET_STATUS' }
  | {
      type: 'PLAYER_ACTION';
      payload: {
        matchId: number;
        userId: number;
        ronda: number;
        microjuegoId: string;
        componenteUsado: CircuitComponentType | string;
        tiempoReaccionMs: number;
      };
    };

// Eventos de salida WebSocket (Servidor -> Cliente)
export type ServerWebSocketMessage =
  | {
      type: 'CONNECTED';
      host: string;
      serial: HardwareStationStatus;
      wsClients: number;
      timestamp: number;
    }
  | {
      type: 'STATUS';
      serial: HardwareStationStatus;
      host: string;
      wsClients: number;
      timestamp: number;
    }
  | {
      type: 'AUTH_WAITING';
      pin: string;
      sessionId: number | null;
      message: string;
      timestamp: number;
    }
  | {
      type: 'AUTH_LINKED';
      uid: string;
      userId?: number;
      message: string;
      timestamp: number;
    }
  | {
      type: 'HARDWARE_EVENT';
      event: string;
      data: string | number | Record<string, unknown>;
      timestamp: number;
    }
  | {
      type: 'SYSTEM_EVENT';
      event: string;
      data: Record<string, unknown>;
      timestamp: number;
    }
  | {
      type: 'COMMAND_ACK';
      command: string;
      timestamp: number;
    }
  | {
      type: 'MATCH_STATE_SYNC';
      match: MatchDto;
      timestamp: number;
    }
  | {
      type: 'ERROR';
      error: string;
      timestamp: number;
    };
