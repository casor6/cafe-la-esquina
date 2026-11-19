import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { hashearContrasena } from '../src/auth/contrasenas.js';
import { Reloj } from '../src/common/reloj.js';
import { configurarApp } from '../src/configurar-app.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { crearClientePrisma } from '../src/prisma/crear-cliente.js';
import { sembrarMenu } from '../prisma/menu-inicial.js';

const AHORA = new Date('2026-11-17T10:05:00-06:00');
const HORA_VALIDA = new Date('2026-11-17T11:00:00-06:00').toISOString();
const ORIGEN = 'http://localhost:4321';
const ADMIN = { usuario: 'prueba', contrasena: 'cafe-de-prueba-2026' };

let app: NestExpressApplication;
let servidor: App;
let prisma: PrismaClient;
let ids: { capuchino: number; chilaquiles: number; avena: number; pollo: number; americano: number };
let contadorIp = 0;

function ip(): string {
  contadorIp += 1;
  return `203.0.113.${contadorIp % 250}`;
}

function post(ruta: string, ipFija = ip()) {
  return request(servidor)
    .post(`/api/v1${ruta}`)
    .set('X-Forwarded-For', ipFija)
    .set('Origin', ORIGEN)
    .set('X-Requested-With', 'fetch');
}

async function iniciarSesion(): Promise<string> {
  const res = await post('/auth/login').send(ADMIN).expect(200);
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0];
  return cookie.split(';')[0];
}

function pedidoValido() {
  return {
    nombre: 'María López',
    telefono: '55 1234 5678',
    horaRecogida: HORA_VALIDA,
    items: [
      { productoId: ids.capuchino, cantidad: 2, opcionId: ids.avena },
      { productoId: ids.chilaquiles, cantidad: 1, opcionId: ids.pollo },
    ],
  };
}

beforeAll(async () => {
  prisma = crearClientePrisma(process.env.DATABASE_URL!);
  await prisma.pedidoItem.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.sesion.deleteMany();
  await prisma.admin.deleteMany();
  await sembrarMenu(prisma);
  await prisma.admin.create({
    data: { usuario: ADMIN.usuario, passwordHash: await hashearContrasena(ADMIN.contrasena) },
  });

  const producto = (nombre: string) => prisma.producto.findUniqueOrThrow({ where: { nombre } });
  const opcion = (nombre: string) => prisma.opcion.findFirstOrThrow({ where: { nombre } });
  ids = {
    capuchino: (await producto('Capuchino')).id,
    chilaquiles: (await producto('Chilaquiles verdes')).id,
    americano: (await producto('Americano')).id,
    avena: (await opcion('Avena')).id,
    pollo: (await opcion('Pollo')).id,
  };

  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Reloj)
    .useValue({ ahora: () => AHORA })
    .compile();
  app = modulo.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
  configurarApp(app);
  await app.init();
  servidor = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

describe('público', () => {
  it('responde salud con cabeceras de seguridad', async () => {
    const res = await request(servidor).get('/api/v1/salud').expect(200);
    expect(res.body).toEqual({ estado: 'ok' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('entrega el menú con opciones y sin campos internos', async () => {
    const res = await request(servidor).get('/api/v1/menu').expect(200);
    const productos = res.body.categorias.flatMap((c: { productos: unknown[] }) => c.productos);
    const capuchino = productos.find((p: { nombre: string }) => p.nombre === 'Capuchino');
    const americano = productos.find((p: { nombre: string }) => p.nombre === 'Americano');
    const chilaquiles = productos.find((p: { nombre: string }) => p.nombre === 'Chilaquiles verdes');
    expect(capuchino.opciones.grupo).toBe('Leche');
    expect(capuchino.opciones.lista.map((o: { nombre: string }) => o.nombre)).toEqual(['Entera', 'Avena', 'Almendra']);
    expect(americano.opciones).toBeNull();
    expect(chilaquiles.opciones).toMatchObject({ grupo: 'Proteína', obligatorio: true });
    expect(Object.keys(capuchino).sort()).toEqual(['detalle', 'id', 'nombre', 'opciones', 'precioCentavos']);
  });

  it('lista horarios desde 15 minutos después de ahora', async () => {
    const res = await request(servidor).get('/api/v1/pedidos/horarios').expect(200);
    expect(res.body.horarios[0]).toBe(new Date('2026-11-17T10:30:00-06:00').toISOString());
  });
});

describe('crear pedido', () => {
  it('crea el pedido con el total calculado en el servidor', async () => {
    const res = await post('/pedidos').send(pedidoValido()).expect(201);
    expect(res.body).toMatchObject({ estado: 'RECIBIDO', totalCentavos: 6800 * 2 + 11000, horaRecogida: HORA_VALIDA });
    expect(res.body.items[0]).toEqual({ nombre: 'Capuchino', opcion: 'Avena', cantidad: 2, subtotalCentavos: 13600 });
    expect(res.body).not.toHaveProperty('telefono');
    const guardado = await prisma.pedido.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardado.telefono).toBe('5512345678');
  });

  it('rechaza campos que no espera, como un total mandado por el navegador', async () => {
    const res = await post('/pedidos').send({ ...pedidoValido(), totalCentavos: 1 }).expect(400);
    expect(res.body.errores.join(' ')).toContain('totalCentavos');
    await post('/pedidos')
      .send({ ...pedidoValido(), items: [{ productoId: ids.americano, cantidad: 1, precio: 1 }] })
      .expect(400);
  });

  it('exige proteína en los chilaquiles', async () => {
    const res = await post('/pedidos')
      .send({ ...pedidoValido(), items: [{ productoId: ids.chilaquiles, cantidad: 1 }] })
      .expect(400);
    expect(res.body.mensaje).toContain('proteína');
  });

  it('rechaza horas fuera de la lista', async () => {
    const horaRecogida = new Date('2026-11-17T21:00:00-06:00').toISOString();
    await post('/pedidos').send({ ...pedidoValido(), horaRecogida }).expect(400);
  });

  it('rechaza teléfono y nombre inválidos', async () => {
    await post('/pedidos').send({ ...pedidoValido(), telefono: '12345' }).expect(400);
    await post('/pedidos').send({ ...pedidoValido(), nombre: '<script>' }).expect(400);
  });

  it('pide la cabecera anti-CSRF y un origen permitido', async () => {
    await request(servidor)
      .post('/api/v1/pedidos')
      .set('X-Forwarded-For', ip())
      .send(pedidoValido())
      .expect(403);
    await request(servidor)
      .post('/api/v1/pedidos')
      .set('X-Forwarded-For', ip())
      .set('X-Requested-With', 'fetch')
      .set('Origin', 'https://otro-sitio.example')
      .send(pedidoValido())
      .expect(403);
  });

  it('rechaza cuerpos de más de 10 kb', async () => {
    await post('/pedidos')
      .send({ ...pedidoValido(), nombre: 'a'.repeat(12_000) })
      .expect(413);
  });

  it('limita a 5 pedidos por IP cada 10 minutos', async () => {
    const misma = ip();
    for (let i = 0; i < 5; i += 1) {
      await post('/pedidos', misma).send({ ...pedidoValido(), telefono: '5500000000' }).expect(201);
    }
    await post('/pedidos', misma).send(pedidoValido()).expect(429);
  });
});

describe('panel', () => {
  it('cierra las rutas de admin sin sesión', async () => {
    await request(servidor).get('/api/v1/admin/pedidos').expect(401);
    await request(servidor).get('/api/v1/auth/yo').expect(401);
    await request(servidor)
      .get('/api/v1/admin/pedidos')
      .set('Authorization', 'Bearer token-inventado-de-mas-de-veinte')
      .expect(401);
  });

  it('responde igual si el usuario no existe o la contraseña está mal', async () => {
    const a = await post('/auth/login').send({ usuario: 'nadie', contrasena: 'x' }).expect(401);
    const b = await post('/auth/login').send({ usuario: ADMIN.usuario, contrasena: 'incorrecta' }).expect(401);
    expect(a.body).toEqual(b.body);
    await prisma.admin.update({ where: { usuario: ADMIN.usuario }, data: { intentosFallidos: 0 } });
  });

  it('pone la cookie de sesión segura', async () => {
    const res = await post('/auth/login').send(ADMIN).expect(200);
    const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0];
    expect(cookie).toMatch(/^__Host-sesion=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
    expect(res.body).not.toHaveProperty('token');
  });

  it('lista pedidos del día y avanza estados sin saltos', async () => {
    const cookie = await iniciarSesion();
    const creado = await post('/pedidos').send(pedidoValido()).expect(201);

    const lista = await request(servidor)
      .get('/api/v1/admin/pedidos?fecha=2026-11-17')
      .set('Cookie', cookie)
      .expect(200);
    const pedido = lista.body.pedidos.find((p: { id: string }) => p.id === creado.body.id);
    expect(pedido).toMatchObject({ nombreCliente: 'María López', telefono: '5512345678', estado: 'RECIBIDO' });

    const avanzar = (estadoActual: string) =>
      request(servidor)
        .patch(`/api/v1/admin/pedidos/${creado.body.id}/estado`)
        .set('Cookie', cookie)
        .set('Origin', ORIGEN)
        .set('X-Requested-With', 'fetch')
        .send({ estadoActual });

    expect((await avanzar('RECIBIDO').expect(200)).body.estado).toBe('PREPARANDO');
    await avanzar('RECIBIDO').expect(409);
    expect((await avanzar('PREPARANDO').expect(200)).body.estado).toBe('LISTO');
    expect((await avanzar('LISTO').expect(200)).body.estado).toBe('ENTREGADO');
    await avanzar('ENTREGADO').expect(409);
    await avanzar('CANCELADO').expect(400);
  });

  it('rechaza cambios con cookie pero sin origen', async () => {
    const cookie = await iniciarSesion();
    const creado = await post('/pedidos').send(pedidoValido()).expect(201);
    await request(servidor)
      .patch(`/api/v1/admin/pedidos/${creado.body.id}/estado`)
      .set('Cookie', cookie)
      .set('X-Requested-With', 'fetch')
      .send({ estadoActual: 'RECIBIDO' })
      .expect(403);
  });

  it('permite el preflight con credenciales solo al origen de la página', async () => {
    const permitido = await request(servidor)
      .options('/api/v1/admin/pedidos/x/estado')
      .set('Origin', ORIGEN)
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'content-type,x-requested-with')
      .expect(204);
    expect(permitido.headers['access-control-allow-origin']).toBe(ORIGEN);
    expect(permitido.headers['access-control-allow-credentials']).toBe('true');

    const ajeno = await request(servidor)
      .options('/api/v1/admin/pedidos/x/estado')
      .set('Origin', 'http://localhost:9999')
      .set('Access-Control-Request-Method', 'PATCH');
    expect(ajeno.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rechaza cambios con cookie desde otro origen del mismo sitio', async () => {
    const cookie = await iniciarSesion();
    const creado = await post('/pedidos').send(pedidoValido()).expect(201);
    await request(servidor)
      .patch(`/api/v1/admin/pedidos/${creado.body.id}/estado`)
      .set('Cookie', cookie)
      .set('Origin', 'http://localhost:9999')
      .set('X-Requested-With', 'fetch')
      .send({ estadoActual: 'RECIBIDO' })
      .expect(403);
  });

  it('valida el id y la fecha', async () => {
    const cookie = await iniciarSesion();
    await request(servidor).get('/api/v1/admin/pedidos?fecha=ayer').set('Cookie', cookie).expect(400);
    await request(servidor)
      .patch('/api/v1/admin/pedidos/123/estado')
      .set('Cookie', cookie)
      .set('Origin', ORIGEN)
      .set('X-Requested-With', 'fetch')
      .send({ estadoActual: 'RECIBIDO' })
      .expect(400);
  });

  it('cierra sesión e invalida la cookie', async () => {
    const cookie = await iniciarSesion();
    await post('/auth/logout').set('Cookie', cookie).expect(204);
    await request(servidor).get('/api/v1/auth/yo').set('Cookie', cookie).expect(401);
  });

  it('bloquea la cuenta tras 5 contraseñas incorrectas', async () => {
    for (let i = 0; i < 5; i += 1) {
      await post('/auth/login').send({ usuario: ADMIN.usuario, contrasena: 'incorrecta' }).expect(401);
    }
    await post('/auth/login').send(ADMIN).expect(401);
    await prisma.admin.update({
      where: { usuario: ADMIN.usuario },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });
    await post('/auth/login').send(ADMIN).expect(200);
  });

  it('limita los intentos de login por IP', async () => {
    const misma = ip();
    for (let i = 0; i < 5; i += 1) {
      await post('/auth/login', misma).send({ usuario: 'nadie', contrasena: 'x' }).expect(401);
    }
    await post('/auth/login', misma).send(ADMIN).expect(429);
  });
});
