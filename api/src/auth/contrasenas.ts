import argon2 from 'argon2';

export const LONGITUD_MINIMA_CONTRASENA = 12;
export const LONGITUD_MAXIMA_CONTRASENA = 128;

const OPCIONES = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashearContrasena(contrasena: string): Promise<string> {
  return argon2.hash(contrasena, OPCIONES);
}

export async function verificarContrasena(hash: string, contrasena: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, contrasena);
  } catch {
    return false;
  }
}
