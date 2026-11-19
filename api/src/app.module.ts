import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminPedidosModule } from './admin-pedidos/admin-pedidos.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CsrfGuard } from './auth/csrf.guard.js';
import { SesionGuard } from './auth/sesion.guard.js';
import { RelojModule } from './common/reloj.js';
import { validarEntorno } from './config/entorno.js';
import { MenuModule } from './menu/menu.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SaludModule } from './salud/salud.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.ENV_FILE ?? '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validarEntorno,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      errorMessage: 'Demasiadas solicitudes.',
    }),
    PrismaModule,
    RelojModule,
    SaludModule,
    MenuModule,
    PedidosModule,
    AuthModule,
    AdminPedidosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: SesionGuard },
  ],
})
export class AppModule {}
