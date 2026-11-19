import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const limpiarTexto = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;

const limpiarTelefono = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[\s-]/g, '') : value;

export class ItemPedidoDto {
  @IsInt()
  @Min(1)
  productoId: number;

  @IsInt()
  @Min(1)
  @Max(10)
  cantidad: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  opcionId?: number;
}

export class CrearPedidoDto {
  @Transform(limpiarTexto)
  @IsString()
  @Length(2, 60, { message: 'El nombre debe tener entre 2 y 60 caracteres.' })
  @Matches(/^[\p{L}\p{M}' .-]+$/u, { message: 'El nombre solo puede llevar letras, espacios, puntos y guiones.' })
  nombre: string;

  @Transform(limpiarTelefono)
  @IsString()
  @Matches(/^\d{10}$/, { message: 'El teléfono debe tener 10 dígitos.' })
  telefono: string;

  @IsString()
  @IsISO8601({ strict: true, strictSeparator: true }, { message: 'La hora para recoger no es válida.' })
  horaRecogida: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos un producto.' })
  @ArrayMaxSize(20, { message: 'El pedido puede tener hasta 20 renglones.' })
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items: ItemPedidoDto[];
}
