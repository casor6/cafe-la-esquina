import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Matches, Max, Min, validateSync } from 'class-validator';

export class Entorno {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @Matches(/^postgres(ql)?:\/\/.+/)
  DATABASE_URL: string;

  @IsString()
  @Matches(/^https?:\/\/[^,\s]+(,https?:\/\/[^,\s]+)*$/)
  CORS_ORIGINS: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY: number = 1;
}

export function validarEntorno(crudo: Record<string, unknown>): Entorno {
  const entorno = plainToInstance(Entorno, crudo, { exposeDefaultValues: true });
  const errores = validateSync(entorno, { skipMissingProperties: false });
  if (errores.length > 0) {
    const faltantes = errores.map((e) => e.property).join(', ');
    throw new Error(`Configuración inválida o incompleta: ${faltantes}`);
  }
  return entorno;
}

export function origenesPermitidos(entorno: Pick<Entorno, 'CORS_ORIGINS'>): string[] {
  return entorno.CORS_ORIGINS.split(',').map((o) => o.trim());
}
