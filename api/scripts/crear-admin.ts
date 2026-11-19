import { createInterface, Interface } from 'node:readline';
import { Writable } from 'node:stream';
import { config } from 'dotenv';
import {
  hashearContrasena,
  LONGITUD_MAXIMA_CONTRASENA,
  LONGITUD_MINIMA_CONTRASENA,
} from '../src/auth/contrasenas.js';
import { crearClientePrisma } from '../src/prisma/crear-cliente.js';

config({ path: process.env.ENV_FILE ?? '.env', quiet: true });

class SalidaSilenciable extends Writable {
  silencio = false;

  override _write(chunk: Buffer, _codificacion: BufferEncoding, listo: () => void): void {
    if (!this.silencio) process.stdout.write(chunk);
    listo();
  }
}

const salida = new SalidaSilenciable();
const lector: Interface = createInterface({ input: process.stdin, output: salida, terminal: true });

function preguntar(texto: string, oculto = false): Promise<string> {
  return new Promise((resolver) => {
    process.stdout.write(texto);
    salida.silencio = oculto;
    lector.question('', (respuesta) => {
      salida.silencio = false;
      if (oculto) process.stdout.write('\n');
      resolver(respuesta);
    });
  });
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL.');

  const usuario = (await preguntar('Usuario del panel: ')).trim();
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
    throw new Error('El usuario debe tener de 3 a 40 caracteres: minúsculas, números, punto, guion o guion bajo.');
  }

  const contrasena = await preguntar(`Contraseña (mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres): `, true);
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA || contrasena.length > LONGITUD_MAXIMA_CONTRASENA) {
    throw new Error(
      `La contraseña debe tener entre ${LONGITUD_MINIMA_CONTRASENA} y ${LONGITUD_MAXIMA_CONTRASENA} caracteres.`,
    );
  }
  const confirmacion = await preguntar('Repite la contraseña: ', true);
  if (confirmacion !== contrasena) throw new Error('Las contraseñas no coinciden.');

  const prisma = crearClientePrisma(url);
  try {
    const passwordHash = await hashearContrasena(contrasena);
    const existente = await prisma.admin.findUnique({ where: { usuario }, select: { id: true } });
    if (existente) {
      await prisma.$transaction([
        prisma.admin.update({
          where: { id: existente.id },
          data: { passwordHash, intentosFallidos: 0, bloqueadoHasta: null },
        }),
        prisma.sesion.deleteMany({ where: { adminId: existente.id } }),
      ]);
      console.log(`Contraseña de "${usuario}" actualizada. Se cerraron sus sesiones abiertas.`);
    } else {
      await prisma.admin.create({ data: { usuario, passwordHash } });
      console.log(`Usuario "${usuario}" creado.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'No se pudo crear el usuario.');
    process.exitCode = 1;
  })
  .finally(() => lector.close());
