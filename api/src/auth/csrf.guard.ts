import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Entorno, origenesPermitidos } from '../config/entorno.js';
import { tokenBearer, tokenCookie } from './token.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CABECERA_CSRF = 'x-requested-with';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly origenes: Set<string>;

  constructor(config: ConfigService<Entorno, true>) {
    this.origenes = new Set(origenesPermitidos({ CORS_ORIGINS: config.get('CORS_ORIGINS', { infer: true }) }));
  }

  canActivate(contexto: ExecutionContext): boolean {
    const req = contexto.switchToHttp().getRequest<Request>();
    if (METODOS_SEGUROS.has(req.method)) return true;

    if (tokenBearer(req) && !tokenCookie(req)) return true;

    if (!req.headers[CABECERA_CSRF]) throw new ForbiddenException();

    const origen = req.headers.origin;
    if (origen !== undefined && !this.origenes.has(origen)) throw new ForbiddenException();

    if (tokenCookie(req) && origen === undefined && req.headers['sec-fetch-site'] !== 'same-origin') {
      throw new ForbiddenException();
    }

    return true;
  }
}
