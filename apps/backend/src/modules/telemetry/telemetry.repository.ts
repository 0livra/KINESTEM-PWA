import { TelemetryModel, ITelemetryDocument, TipoResultado } from './telemetry.model';

export interface TelemetryInput {
  match_id: number;
  user_id: number;
  estacion_hardware_id?: number;
  ronda: number;
  microjuego_id: string;
  concepto_stem: string;
  dificultad_nivel?: number;
  tiempo_limite_ms: number;
  tipo_resultado: TipoResultado;
  accion_fisica?: {
    componente_esperado?: string;
    componente_utilizado?: string;
    tiempo_reaccion_ms?: number;
    es_secuencia?: boolean;
    precision_secuencia_pct?: number;
  } | null;
  vidas_restantes: number;
  jugador_eliminado: boolean;
  timestamp?: Date;
}

export interface RadarDataPoint {
  userId: number;
  reflejos_ms: number;
  precision_pct: number;
  coordinacion_pct: number;
}

export interface HonorificAward {
  tipo: 'mas_rapido' | 'mas_lento';
  userId: number;
  valor_ms: number;
}

export interface MortalityDataPoint {
  ronda: number;
  microjuego_id: string;
  concepto_stem: string;
  total_errores: number;
  eliminaciones: number;
}

export interface PostMatchDashboard {
  radarData: RadarDataPoint[];
  honorifics: HonorificAward[];
  mortalityLine: MortalityDataPoint[];
  userIds: number[];
}

export interface ITelemetryRepository {
  insert(data: TelemetryInput): Promise<ITelemetryDocument>;
  getPostMatchDashboard(matchId: number): Promise<PostMatchDashboard>;
}

export class TelemetryRepository implements ITelemetryRepository {
  public async insert(data: TelemetryInput): Promise<ITelemetryDocument> {
    const doc = new TelemetryModel({ ...data, timestamp: data.timestamp ?? new Date() });
    return doc.save();
  }

  public async getPostMatchDashboard(matchId: number): Promise<PostMatchDashboard> {
    // .lean() para objetos planos JS sin sobrecarga de hidratación
    const events = await TelemetryModel.find({ match_id: matchId }).lean().exec();
    if (events.length === 0) return { radarData: [], honorifics: [], mortalityLine: [], userIds: [] };

    // Agregar por userId para Radar
    const byUser = new Map<number, {
      reaccionSum: number; reaccionCount: number;
      exitoCount: number; totalCount: number;
      coordSum: number; coordCount: number;
    }>();

    for (const ev of events) {
      const uid = ev.user_id;
      if (!byUser.has(uid)) byUser.set(uid, { reaccionSum: 0, reaccionCount: 0, exitoCount: 0, totalCount: 0, coordSum: 0, coordCount: 0 });
      const agg = byUser.get(uid)!;
      agg.totalCount++;
      if (ev.tipo_resultado === 'EXITO') agg.exitoCount++;
      if (ev.accion_fisica?.tiempo_reaccion_ms != null) { agg.reaccionSum += ev.accion_fisica.tiempo_reaccion_ms; agg.reaccionCount++; }
      if (ev.accion_fisica?.precision_secuencia_pct != null) { agg.coordSum += ev.accion_fisica.precision_secuencia_pct; agg.coordCount++; }
    }

    const radarData: RadarDataPoint[] = [];
    for (const [userId, agg] of byUser.entries()) {
      radarData.push({
        userId,
        reflejos_ms: agg.reaccionCount > 0 ? Math.round(agg.reaccionSum / agg.reaccionCount) : 0,
        precision_pct: agg.totalCount > 0 ? Math.round((agg.exitoCount / agg.totalCount) * 100) : 0,
        coordinacion_pct: agg.coordCount > 0 ? Math.round((agg.coordSum / agg.coordCount) * 100) / 100 : 0,
      });
    }

    // Premios Honoríficos
    const honorifics: HonorificAward[] = [];
    const withReaction = radarData.filter((r) => r.reflejos_ms > 0);
    if (withReaction.length > 0) {
      const sorted = [...withReaction].sort((a, b) => a.reflejos_ms - b.reflejos_ms);
      honorifics.push({ tipo: 'mas_rapido', userId: sorted[0]!.userId, valor_ms: sorted[0]!.reflejos_ms });
      if (sorted.length > 1) honorifics.push({ tipo: 'mas_lento', userId: sorted[sorted.length - 1]!.userId, valor_ms: sorted[sorted.length - 1]!.reflejos_ms });
    }

    // Línea de Mortalidad
    const mortalityMap = new Map<string, MortalityDataPoint>();
    for (const ev of events) {
      if (ev.tipo_resultado === 'EXITO') continue;
      const key = `${ev.ronda}__${ev.microjuego_id}__${ev.concepto_stem}`;
      if (!mortalityMap.has(key)) mortalityMap.set(key, { ronda: ev.ronda, microjuego_id: ev.microjuego_id, concepto_stem: ev.concepto_stem, total_errores: 0, eliminaciones: 0 });
      const pt = mortalityMap.get(key)!;
      pt.total_errores++;
      if (ev.jugador_eliminado) pt.eliminaciones++;
    }

    const mortalityLine = Array.from(mortalityMap.values()).sort((a, b) => a.ronda - b.ronda || b.total_errores - a.total_errores);
    const userIds = Array.from(byUser.keys());
    return { radarData, honorifics, mortalityLine, userIds };
  }
}

export const telemetryRepository = new TelemetryRepository();
