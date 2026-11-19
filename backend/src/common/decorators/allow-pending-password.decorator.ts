import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_PASSWORD_KEY = 'allowPendingPassword';

/**
 * Permite la ruta aunque el usuario tenga una contraseña temporal sin cambiar.
 * El resto de la API responde 403 hasta que la cambie.
 */
export const AllowPendingPassword = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD_KEY, true);
