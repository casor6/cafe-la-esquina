import type { Request } from 'express';
import type { AdminAutenticado } from './auth.service.js';

export const COOKIE_SESION = '__Host-sesion';

export interface SolicitudConAdmin extends Request {
  admin?: AdminAutenticado;
}

export function tokenBearer(req: Request): string | undefined {
  const cabecera = req.headers.authorization;
  if (!cabecera?.startsWith('Bearer ')) return undefined;
  return cabecera.slice(7).trim() || undefined;
}

export function tokenCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const valor = cookies?.[COOKIE_SESION];
  return typeof valor === 'string' && valor.length > 0 ? valor : undefined;
}

export function tokenDeSolicitud(req: Request): string | undefined {
  return tokenBearer(req) ?? tokenCookie(req);
}
