import { IMatchesRepository, matchesRepository, PartidaEntity } from './matches.repository';
import { NotFoundError, ValidationError } from '../../shared/middlewares/error.middleware';

export class MatchesService {
  constructor(private readonly repo: IMatchesRepository = matchesRepository) {}

  public async createMatch(): Promise<PartidaEntity> { return this.repo.create(); }

  public async getMatch(matchId: number): Promise<PartidaEntity> {
    const match = await this.repo.findById(matchId);
    if (!match) throw new NotFoundError(`Partida ${matchId} no encontrada.`);
    return match;
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
