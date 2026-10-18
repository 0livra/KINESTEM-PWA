export interface UsuarioEntity {
  user_id: number;
  username: string;
  rfid_uid: string | null;
  pin_temporal: string | null;
  saldo_puntos: number;
  avatar_id: string;
  fecha_creacion: Date;
}

export interface PublicUserProfileDto {
  userId: number;
  username: string;
  saldoPuntos: number;
  avatarId: string;
}

export interface CreateUsuarioParams {
  username: string;
  avatarId?: string;
}

export interface PairingLinkParams {
  pinTemporal: string;
  rfidUid: string;
  /** Partida activa: al vincular se admite al jugador validando anti-duplicados. */
  matchId?: number;
}
