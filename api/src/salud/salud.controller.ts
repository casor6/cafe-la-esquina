import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Publica } from '../common/publica.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Publica()
  @SkipThrottle()
  @Get()
  @Header('Cache-Control', 'no-store')
  async revisar(): Promise<{ estado: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException();
    }
    return { estado: 'ok' };
  }
}
