import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { Publica } from '../common/publica.decorator.js';
import { type AdminAutenticado, AuthService, DURACION_SESION_MS } from './auth.service.js';
import { LoginDto } from './login.dto.js';
import { COOKIE_SESION, type SolicitudConAdmin, tokenDeSolicitud } from './token.js';

const opcionesCookie: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publica()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: SolicitudConAdmin,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ admin: AdminAutenticado; expiraEn: string }> {
    const sesion = await this.auth.iniciarSesion(dto.usuario, dto.contrasena, req.ip ?? 'desconocida');
    res.cookie(COOKIE_SESION, sesion.token, { ...opcionesCookie, maxAge: DURACION_SESION_MS });
    return { admin: sesion.admin, expiraEn: sesion.expiraEn.toISOString() };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: SolicitudConAdmin, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = tokenDeSolicitud(req);
    if (token) await this.auth.cerrarSesion(token);
    res.clearCookie(COOKIE_SESION, opcionesCookie);
  }

  @Get('yo')
  @Header('Cache-Control', 'no-store')
  yo(@Req() req: SolicitudConAdmin): { admin: AdminAutenticado | undefined } {
    return { admin: req.admin };
  }
}
