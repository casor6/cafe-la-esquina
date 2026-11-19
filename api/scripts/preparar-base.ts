import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const ROL_APP = 'cafe_app';
const SUFIJO_TEST = '_test';

function leerVariable(nombre: string): URL {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta la variable de entorno ${nombre}.`);
    process.exit(1);
  }
  return new URL(valor);
}

function conBase(url: URL, base: string): URL {
  const copia = new URL(url.toString());
  copia.pathname = `/${base}`;
  copia.searchParams.set('sslmode', 'verify-full');
  return copia;
}

function conCredenciales(url: URL, usuario: string, clave: string): URL {
  const copia = new URL(url.toString());
  copia.username = usuario;
  copia.password = clave;
  return copia;
}

async function conectar(url: URL): Promise<pg.Client> {
  const cliente = new pg.Client({ connectionString: url.toString() });
  await cliente.connect();
  return cliente;
}

async function otorgarPermisos(url: URL, base: string, dueno: string): Promise<void> {
  const cliente = await conectar(conBase(url, base));
  const rol = cliente.escapeIdentifier(ROL_APP);
  const duenoId = cliente.escapeIdentifier(dueno);
  try {
    await cliente.query(`GRANT CONNECT ON DATABASE ${cliente.escapeIdentifier(base)} TO ${rol}`);
    await cliente.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
    await cliente.query(`REVOKE CREATE ON SCHEMA public FROM ${rol}`);
    await cliente.query(`GRANT USAGE ON SCHEMA public TO ${rol}`);
    await cliente.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${rol}`);
    await cliente.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${rol}`);
    await cliente.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${duenoId} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${rol}`,
    );
    await cliente.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${duenoId} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${rol}`,
    );
  } finally {
    await cliente.end();
  }
}

function archivoEnv(valores: Record<string, string>): string {
  return (
    Object.entries(valores)
      .map(([clave, valor]) => `${clave}="${valor}"`)
      .join('\n') + '\n'
  );
}

async function main(): Promise<void> {
  const pooler = leerVariable('NEON_DATABASE_URL');
  const directa = leerVariable('NEON_DIRECT_URL');
  const dueno = decodeURIComponent(directa.username);
  const basePrincipal = directa.pathname.slice(1);
  const baseTest = `${basePrincipal}${SUFIJO_TEST}`;
  const clave = randomBytes(32).toString('base64url');

  const admin = await conectar(conBase(directa, basePrincipal));
  try {
    const existe = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [ROL_APP]);
    const rol = admin.escapeIdentifier(ROL_APP);
    const claveSql = admin.escapeLiteral(clave);
    await admin.query(
      existe.rowCount
        ? `ALTER ROLE ${rol} WITH PASSWORD ${claveSql}`
        : `CREATE ROLE ${rol} WITH LOGIN NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD ${claveSql}`,
    );
    console.log(`Rol ${ROL_APP}: ${existe.rowCount ? 'contraseña renovada' : 'creado'}.`);

    const hayTest = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [baseTest]);
    if (!hayTest.rowCount) {
      await admin.query(`CREATE DATABASE ${admin.escapeIdentifier(baseTest)}`);
      console.log(`Base ${baseTest}: creada.`);
    } else {
      console.log(`Base ${baseTest}: ya existía.`);
    }
  } finally {
    await admin.end();
  }

  for (const base of [basePrincipal, baseTest]) {
    await otorgarPermisos(directa, base, dueno);
    console.log(`Permisos de ${ROL_APP} en ${base}: listos.`);
  }

  const comunes = {
    NODE_ENV: 'development',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:4321',
    TRUST_PROXY: '1',
  };

  const destino = join(import.meta.dirname, '..');
  writeFileSync(
    join(destino, '.env'),
    archivoEnv({
      ...comunes,
      DATABASE_URL: conCredenciales(conBase(pooler, basePrincipal), ROL_APP, clave).toString(),
      DIRECT_URL: conBase(directa, basePrincipal).toString(),
    }),
    { mode: 0o600 },
  );
  writeFileSync(
    join(destino, '.env.test'),
    archivoEnv({
      ...comunes,
      NODE_ENV: 'test',
      DATABASE_URL: conCredenciales(conBase(pooler, baseTest), ROL_APP, clave).toString(),
      DIRECT_URL: conBase(directa, baseTest).toString(),
    }),
    { mode: 0o600 },
  );
  console.log('Archivos api/.env y api/.env.test escritos (permisos 600).');
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : 'error desconocido';
  console.error(`No se pudo preparar la base: ${mensaje.replace(/postgres(ql)?:\/\/\S+/g, '[url oculta]')}`);
  process.exit(1);
});
