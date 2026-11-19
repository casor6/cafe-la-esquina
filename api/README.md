# API de Café La Esquina

NestJS 12 + Prisma 7 + Postgres en Neon. Recibe pedidos para recoger y alimenta el panel. Prefijo de todas las rutas: `/api/v1`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API en `http://localhost:3000` con recarga |
| `npm test` | Pruebas unitarias (horarios, cálculo, estados) |
| `npm run test:e2e` | Migra `neondb_test` y corre las pruebas de punta a punta |
| `npm run db:migrar -- --name <nombre>` | Crea y aplica una migración nueva |
| `npm run db:desplegar` | Aplica migraciones pendientes (producción) |
| `npm run db:seed` | Carga o actualiza el menú desde `prisma/menu-inicial.ts` |
| `npm run crear-admin` | Crea el usuario del panel o le cambia la contraseña |
| `npm run db:preparar` | Crea el rol `cafe_app`, la base `_test` y escribe `.env` y `.env.test` (renueva la contraseña del rol) |
| `npx prisma studio` | Editor visual de la base, útil para cambiar el menú |

Se instaló con npm 11 (`npx npm@11 install`) por un bug de npm 10.9 con dependencias peer.

## Variables de entorno

Ver `.env.example`. La app no arranca si falta alguna.

- `DATABASE_URL`: rol `cafe_app` (solo SELECT/INSERT/UPDATE/DELETE) por el pooler de Neon.
- `DIRECT_URL`: rol dueño, conexión directa. Solo la usa Prisma para migrar.
- `CORS_ORIGINS`: dominios permitidos separados por coma.
- `TRUST_PROXY`: número de proxies delante de la API (para tomar la IP real).

## Rutas

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/salud` | pública |
| GET | `/menu` | pública |
| GET | `/pedidos/horarios` | pública |
| POST | `/pedidos` | pública, 5 cada 10 min por IP |
| POST | `/auth/login` | pública, 5 cada 15 min por IP |
| POST | `/auth/logout` | sesión |
| GET | `/auth/yo` | sesión |
| GET | `/admin/pedidos?fecha=AAAA-MM-DD` | sesión |
| PATCH | `/admin/pedidos/:id/estado` | sesión, cuerpo `{ "estadoActual": "RECIBIDO" }` |

Toda ruta pide sesión salvo las marcadas con `@Publica()`. Las peticiones que cambian datos deben mandar `X-Requested-With` y, si traen `Origin`, debe estar en `CORS_ORIGINS`.

## Horario duplicado

El horario de apertura vive en `src/pedidos/horario.ts` (para validar pedidos) y en `../src/data/negocio.ts` (para mostrarlo en la página). Si cambia, actualiza los dos.

## Cambiar el menú

Edita con `npx prisma studio` o en `prisma/menu-inicial.ts` y corre `npm run db:seed`. Después vuelve a desplegar la página en Vercel para que el pizarrón se actualice.
