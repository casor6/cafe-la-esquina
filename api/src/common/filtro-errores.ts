import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorDeNegocio } from './error-de-negocio.js';

const MENSAJES: Record<number, string> = {
  400: 'La solicitud no es válida.',
  401: 'No autorizado.',
  403: 'Acceso denegado.',
  404: 'No encontrado.',
  409: 'La solicitud entra en conflicto con el estado actual.',
  413: 'La solicitud es demasiado grande.',
  429: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
};

const VIGILADOS = new Set([401, 403, 429]);

function erroresDeValidacion(respuesta: unknown): string[] | undefined {
  if (typeof respuesta !== 'object' || respuesta === null) return undefined;
  const mensaje = (respuesta as { message?: unknown }).message;
  if (Array.isArray(mensaje)) return mensaje.filter((m): m is string => typeof m === 'string');
  return undefined;
}

function mensajePropio(respuesta: unknown): string | undefined {
  if (typeof respuesta === 'string') return respuesta;
  if (typeof respuesta !== 'object' || respuesta === null) return undefined;
  const mensaje = (respuesta as { message?: unknown }).message;
  return typeof mensaje === 'string' ? mensaje : undefined;
}

@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const respuesta = error.getResponse();

      if (VIGILADOS.has(status)) {
        this.logger.warn(`${status} ${req.method} ${req.path} ip=${req.ip ?? 'desconocida'}`);
      }

      if (status >= 500) {
        this.logger.error(`${status} ${req.method} ${req.path}`, error.stack);
        res.status(status).json({ statusCode: status, mensaje: 'Ocurrió un error. Intenta de nuevo.' });
        return;
      }

      const errores = status === 400 ? erroresDeValidacion(respuesta) : undefined;
      const propio = errores ? undefined : mensajePropio(respuesta);
      const usarPropio = propio && error instanceof ErrorDeNegocio;
      res.status(status).json({
        statusCode: status,
        mensaje: usarPropio ? propio : (MENSAJES[status] ?? 'La solicitud no se pudo completar.'),
        ...(errores ? { errores } : {}),
      });
      return;
    }

    const tipo = typeof error === 'object' && error !== null && 'type' in error ? String(error.type) : '';
    if (tipo === 'entity.too.large') {
      res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({ statusCode: 413, mensaje: MENSAJES[413] });
      return;
    }
    if (tipo === 'entity.parse.failed') {
      res.status(HttpStatus.BAD_REQUEST).json({ statusCode: 400, mensaje: MENSAJES[400] });
      return;
    }

    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`500 ${req.method} ${req.path}`, stack);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, mensaje: 'Ocurrió un error. Intenta de nuevo.' });
  }
}
