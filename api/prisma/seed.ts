import { config } from 'dotenv';
import { crearClientePrisma } from '../src/prisma/crear-cliente.js';
import { sembrarMenu } from './menu-inicial.js';

config({ path: process.env.ENV_FILE ?? '.env', quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL.');
  process.exit(1);
}

const prisma = crearClientePrisma(url);

try {
  await sembrarMenu(prisma);
  console.log('Menú cargado.');
} catch (error) {
  console.error('No se pudo cargar el menú:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
