import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export function crearAdaptador(url: string): PrismaPg {
  return new PrismaPg({ connectionString: url, max: 5 });
}

export function crearClientePrisma(url: string): PrismaClient {
  return new PrismaClient({ adapter: crearAdaptador(url) });
}
