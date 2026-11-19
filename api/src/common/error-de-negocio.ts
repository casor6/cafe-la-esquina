import { HttpException, HttpStatus } from '@nestjs/common';

export class ErrorDeNegocio extends HttpException {
  constructor(mensaje: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(mensaje, status);
  }
}
