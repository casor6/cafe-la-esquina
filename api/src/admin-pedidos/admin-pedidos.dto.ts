import { IsIn, IsOptional, Matches } from 'class-validator';
import { EstadoPedido } from '../generated/prisma/enums.js';

export class ListarPedidosDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { message: 'La fecha debe tener formato AAAA-MM-DD.' })
  fecha?: string;
}

export class AvanzarEstadoDto {
  @IsIn(Object.values(EstadoPedido))
  estadoActual: EstadoPedido;
}
