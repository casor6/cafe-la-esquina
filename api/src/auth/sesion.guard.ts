import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RUTA_PUBLICA } from '../common/publica.decorator.js';
import { AuthService } from './auth.service.js';
import { SolicitudConAdmin, tokenDeSolicitud } from './token.js';

@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(RUTA_PUBLICA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publica) return true;

    const req = contexto.switchToHttp().getRequest<SolicitudConAdmin>();
    const token = tokenDeSolicitud(req);
    const admin = token ? await this.auth.validarSesion(token) : null;
    if (!admin) throw new UnauthorizedException();

    req.admin = admin;
    return true;
  }
}
