import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const INSECURE_SECRETS = new Set([
  'development-only-secret',
  'change-me',
  'changeme',
  'secret',
]);

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

export class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message:
      'JWT_SECRET debe tener al menos 32 caracteres. Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
  })
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN = '8h';

  /** Orígenes permitidos para CORS separados por coma. */
  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  /** Ruta absoluta o relativa (al directorio de trabajo) de la carpeta storage. */
  @IsOptional()
  @IsString()
  STORAGE_PATH?: string;

  /** true cuando Nginx entrega los archivos mediante X-Accel-Redirect. */
  @Transform(toBoolean)
  @IsBoolean()
  FILES_ACCEL_REDIRECT = false;

  /** true en producción con HTTPS para marcar la cookie como Secure. */
  @Transform(toBoolean)
  @IsBoolean()
  COOKIE_SECURE = false;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .map((message) => `  - ${message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${details}`);
  }

  if (INSECURE_SECRETS.has(validated.JWT_SECRET)) {
    throw new Error(
      'JWT_SECRET usa un valor inseguro conocido. Define un secreto aleatorio.',
    );
  }

  return validated;
}
