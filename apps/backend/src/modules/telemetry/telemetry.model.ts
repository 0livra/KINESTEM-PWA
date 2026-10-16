import { Schema, model, Document } from 'mongoose';

export type TipoResultado = 'EXITO' | 'ERROR_COMPONENTE' | 'TIMEOUT';

export interface AccionFisica {
  componente_esperado?: string;
  componente_utilizado?: string;
  tiempo_reaccion_ms?: number;
  es_secuencia?: boolean;
  precision_secuencia_pct?: number;
}

/**
 * INVARIANTE DE PRIVACIDAD:
 * No contiene username, rfid_uid ni pin_temporal.
 * Solo referencias opacas: user_id y match_id.
 */
export interface ITelemetryDocument extends Document {
  match_id: number;
  user_id: number;
  estacion_hardware_id?: number;
  ronda: number;
  microjuego_id: string;
  concepto_stem: string;
  dificultad_nivel?: number;
  tiempo_limite_ms: number;
  tipo_resultado: TipoResultado;
  accion_fisica?: AccionFisica | null;
  vidas_restantes: number;
  jugador_eliminado: boolean;
  timestamp: Date;
}

const AccionFisicaSchema = new Schema<AccionFisica>(
  {
    componente_esperado: { type: String },
    componente_utilizado: { type: String },
    tiempo_reaccion_ms: { type: Number },
    es_secuencia: { type: Boolean },
    precision_secuencia_pct: { type: Number },
  },
  { _id: false }
);

const TelemetrySchema = new Schema<ITelemetryDocument>(
  {
    match_id: { type: Number, required: true },
    user_id: { type: Number, required: true },
    estacion_hardware_id: { type: Number },
    ronda: { type: Number, required: true },
    microjuego_id: { type: String, required: true },
    concepto_stem: { type: String, required: true },
    dificultad_nivel: { type: Number },
    tiempo_limite_ms: { type: Number, required: true },
    tipo_resultado: { type: String, enum: ['EXITO', 'ERROR_COMPONENTE', 'TIMEOUT'], required: true },
    accion_fisica: { type: AccionFisicaSchema, default: null },
    vidas_restantes: { type: Number, required: true },
    jugador_eliminado: { type: Boolean, required: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'telemetry_events', versionKey: false }
);

TelemetrySchema.index({ match_id: 1, ronda: 1 });
TelemetrySchema.index({ match_id: 1, user_id: 1 });
TelemetrySchema.index({ timestamp: -1 });

export const TelemetryModel = model<ITelemetryDocument>('Telemetry', TelemetrySchema);
