import { ITelemetryRepository, telemetryRepository, TelemetryInput, PostMatchDashboard } from './telemetry.repository';
import { authUsersService } from '../auth-users/auth-users.service';
import { PublicUserProfileDto } from '../auth-users/auth-users.types';

export interface EnrichedPostMatchDashboard extends PostMatchDashboard {
  profiles: PublicUserProfileDto[];
}

export class TelemetryService {
  constructor(private readonly repo: ITelemetryRepository = telemetryRepository) {}

  public async recordMicrogameTelemetry(data: TelemetryInput): Promise<{ id: string }> {
    const doc = await this.repo.insert(data);
    return { id: String(doc._id) };
  }

  /**
   * Obtiene el dashboard post-partida y cruza user_id con
   * authUsersService.findPublicProfilesByIds (PostgreSQL) en memoria.
   * SIN almacenar datos de identidad en MongoDB.
   */
  public async getPostMatchDashboard(matchId: number): Promise<EnrichedPostMatchDashboard> {
    const dashboard = await this.repo.getPostMatchDashboard(matchId);
    const profiles = await authUsersService.findPublicProfilesByIds(dashboard.userIds);
    return { ...dashboard, profiles };
  }
}

export const telemetryService = new TelemetryService();
