import { postgresService } from '../../config/postgres';
import { authUsersRepository, IAuthUsersRepository } from './auth-users.repository';
import { UsuarioEntity, PublicUserProfileDto, CreateUsuarioParams, PairingLinkParams } from './auth-users.types';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/middlewares/error.middleware';

export class AuthUsersService {
  constructor(private readonly repo: IAuthUsersRepository = authUsersRepository) {}

  public async register(params: CreateUsuarioParams): Promise<PublicUserProfileDto> {
    const existing = await this.repo.findByUsername(params.username);
    if (existing) throw new ConflictError(`El username '${params.username}' ya está en uso.`);
    const user = await this.repo.create(params);
    return this.toPublicDto(user);
  }

  public async generatePairingPin(userId: number): Promise<{ pin: string }> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError(`Usuario ${userId} no encontrado.`);
    const pin = await this.repo.generatePin(userId);
    return { pin };
  }

  public async linkRfidWithPin(params: PairingLinkParams): Promise<PublicUserProfileDto> {
    return postgresService.withTransaction(async (client) => {
      const user = await this.repo.linkRfid(params.pinTemporal, params.rfidUid, client);
      if (!user) throw new ValidationError('PIN inválido, expirado, o RFID ya vinculado.');
      return this.toPublicDto(user);
    });
  }

  public async identifyByRfid(rfidUid: string): Promise<PublicUserProfileDto> {
    const user = await this.repo.findByRfidUid(rfidUid);
    if (!user) throw new NotFoundError('Tarjeta RFID no registrada.');
    return this.toPublicDto(user);
  }

  public async findPublicProfilesByIds(userIds: number[]): Promise<PublicUserProfileDto[]> {
    const users = await this.repo.findManyByIds(userIds);
    return users.map((u) => this.toPublicDto(u));
  }

  public async getUserById(userId: number): Promise<PublicUserProfileDto> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError(`Usuario ${userId} no encontrado.`);
    return this.toPublicDto(user);
  }

  private toPublicDto(entity: UsuarioEntity): PublicUserProfileDto {
    return { userId: entity.user_id, username: entity.username, saldoPuntos: entity.saldo_puntos };
  }
}

export const authUsersService = new AuthUsersService();
