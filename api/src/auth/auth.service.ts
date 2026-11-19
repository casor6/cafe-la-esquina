import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { Reloj } from '../common/reloj.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashearContrasena, verificarContrasena } from './contrasenas.js';

export const DURACION_SESION_MS = 12 * 60 * 60 * 1000;
export const INTENTOS_ANTES_DE_BLOQUEO = 5;
export const DURACION_BLOQUEO_MS = 15 * 60 * 1000;

export interface AdminAutenticado {
  id: number;
  usuario: string;
}

export interface SesionCreada {
  token: string;
  expiraEn: Date;
  admin: AdminAutenticado;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger('Auth');
  private hashSenuelo = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly reloj: Reloj,
  ) {}

  async onModuleInit(): Promise<void> {
    this.hashSenuelo = await hashearContrasena(randomBytes(16).toString('hex'));
  }

  async iniciarSesion(usuario: string, contrasena: string, ip: string): Promise<SesionCreada> {
    const ahora = this.reloj.ahora();
    const admin = await this.prisma.admin.findUnique({
      where: { usuario },
      select: { id: true, usuario: true, passwordHash: true, intentosFallidos: true, bloqueadoHasta: true },
    });

    const valida = await verificarContrasena(admin?.passwordHash ?? this.hashSenuelo, contrasena);

    if (!admin) {
      this.logger.warn(`Login fallido: usuario inexistente ip=${ip}`);
      throw new UnauthorizedException();
    }

    if (admin.bloqueadoHasta && admin.bloqueadoHasta > ahora) {
      this.logger.warn(`Login rechazado: cuenta bloqueada admin=${admin.id} ip=${ip}`);
      throw new UnauthorizedException();
    }

    if (!valida) {
      const intentos = admin.intentosFallidos + 1;
      const bloquear = intentos >= INTENTOS_ANTES_DE_BLOQUEO;
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          intentosFallidos: bloquear ? 0 : intentos,
          bloqueadoHasta: bloquear ? new Date(ahora.getTime() + DURACION_BLOQUEO_MS) : admin.bloqueadoHasta,
        },
      });
      this.logger.warn(
        `Login fallido: contraseña incorrecta admin=${admin.id} intento=${intentos} ip=${ip}${bloquear ? ' (cuenta bloqueada 15 min)' : ''}`,
      );
      throw new UnauthorizedException();
    }

    const token = randomBytes(32).toString('base64url');
    const expiraEn = new Date(ahora.getTime() + DURACION_SESION_MS);

    await this.prisma.$transaction([
      this.prisma.sesion.deleteMany({ where: { expiraEn: { lt: ahora } } }),
      this.prisma.admin.update({
        where: { id: admin.id },
        data: { intentosFallidos: 0, bloqueadoHasta: null },
      }),
      this.prisma.sesion.create({ data: { tokenHash: hashToken(token), adminId: admin.id, expiraEn } }),
    ]);

    this.logger.log(`Login correcto admin=${admin.id} ip=${ip}`);
    return { token, expiraEn, admin: { id: admin.id, usuario: admin.usuario } };
  }

  async validarSesion(token: string): Promise<AdminAutenticado | null> {
    if (token.length < 20 || token.length > 100) return null;
    const sesion = await this.prisma.sesion.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, expiraEn: true, admin: { select: { id: true, usuario: true } } },
    });
    if (!sesion) return null;
    if (sesion.expiraEn <= this.reloj.ahora()) {
      await this.prisma.sesion.deleteMany({ where: { id: sesion.id } });
      return null;
    }
    return sesion.admin;
  }

  async cerrarSesion(token: string): Promise<void> {
    await this.prisma.sesion.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}
