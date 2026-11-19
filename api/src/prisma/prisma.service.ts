import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { crearAdaptador } from './crear-cliente.js';
import type { Entorno } from '../config/entorno.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Entorno, true>) {
    super({ adapter: crearAdaptador(config.get('DATABASE_URL', { infer: true })) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
