import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { CABECERA_CSRF } from './auth/csrf.guard.js';
import { FiltroErrores } from './common/filtro-errores.js';
import { Entorno, origenesPermitidos } from './config/entorno.js';

export function configurarApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);
  const produccion = config.get('NODE_ENV', { infer: true }) === 'production';

  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.useBodyParser('json', { limit: '10kb' });

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] },
      },
      hsts: produccion ? { maxAge: 31_536_000, includeSubDomains: true } : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: origenesPermitidos({ CORS_ORIGINS: config.get('CORS_ORIGINS', { infer: true }) }),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', CABECERA_CSRF],
    maxAge: 600,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new FiltroErrores());
  app.enableShutdownHooks();
}
