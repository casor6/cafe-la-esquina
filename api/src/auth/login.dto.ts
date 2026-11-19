import { IsString, Length } from 'class-validator';
import { LONGITUD_MAXIMA_CONTRASENA } from './contrasenas.js';

export class LoginDto {
  @IsString()
  @Length(3, 40)
  usuario: string;

  @IsString()
  @Length(1, LONGITUD_MAXIMA_CONTRASENA)
  contrasena: string;
}
