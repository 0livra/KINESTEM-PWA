import {
  IMatchesRepository,
  matchesRepository,
  PartidaEntity,
  ParticipantePartidaRow,
} from './matches.repository';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/middlewares/error.middleware';

export interface MatchWithParticipants extends PartidaEntity {
  participantes: ParticipantePartidaRow[];
}

export const DUPLICATE_RFID_MATCH_MESSAGE =
  'Esta tarjeta RFID ya está registrada por otro jugador en la partida actual';

export class MatchesService {
  constructor(private readonly repo: IMatchesRepository = matchesRepository) {}

  public async createMatch(): Promise<PartidaEntity> { return this.repo.create(); }

  public async getMatch(matchId: number): Promise<PartidaEntity> {
    const match = await this.repo.findById(matchId);
    if (!match) throw new NotFoundError(`Partida ${matchId} no encontrada.`);
    return match;
  }

  public async getMatchWithParticipants(matchId: number): Promise<MatchWithParticipants> {
    const match = await this.getMatch(matchId);
    const participantes = await this.repo.findParticipants(matchId);
    return { ...match, participantes };
  }

  /** Partida activa mas reciente (creada o en curso) para la sala fisica. */
  public async getActiveMatch(): Promise<PartidaEntity> {
    const match = await this.repo.findActive();
    if (!match) throw new NotFoundError('No existe una partida activa.');
    return match;
  }

  /**
   * Admision anti-duplicados: rechaza con error explicito si el rfid_uid ya
   * esta registrado entre los participantes de la partida en curso.
   */
  public async admitParticipant(
    matchId: number,
    userId: number,
    rfidUid: string
  ): Promise<{ matchId: number; userId: number; rfidUid: string }> {
    const match = await this.getMatch(matchId);
    if (match.estado === 'finalizada') {
      throw new ValidationError(`Partida ${matchId} ya está finalizada.`);
    }
    const result = await this.repo.admitParticipant(matchId, userId, rfidUid);
    if (result === 'DUPLICATED_RFID') {
      throw new ConflictError(DUPLICATE_RFID_MATCH_MESSAGE);
    }
    return { matchId, userId, rfidUid };
  }

  public async startMatch(matchId: number): Promise<PartidaEntity> {
    const match = await this.getMatch(matchId);
    if (match.estado !== 'creada') throw new ValidationError(`Partida ${matchId} no puede iniciarse (estado: ${match.estado}).`);
    return (await this.repo.updateEstado(matchId, 'en_curso'))!;
  }

  public async finalizeMatch(matchId: number): Promise<PartidaEntity> {
    const match = await this.getMatch(matchId);
    if (match.estado === 'finalizada') throw new ValidationError(`Partida ${matchId} ya está finalizada.`);
    return (await this.repo.updateEstado(matchId, 'finalizada'))!;
  }
}

export const matchesService = new MatchesService();
