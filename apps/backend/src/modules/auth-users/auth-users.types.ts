export interface UsuarioEntity {
  user_id: number;
  username: string;
  rfid_uid: string | null;
  pin_temporal: string | null;
  saldo_puntos: number;
  fecha_creacion: Date;
}

export interface PublicUserProfileDto {
  userId: number;
  username: string;
  saldoPuntos: number;
}

export interface CreateUsuarioParams {
  username: string;
}

export interface PairingLinkParams {
  pinTemporal: string;
  rfidUid: string;
}
