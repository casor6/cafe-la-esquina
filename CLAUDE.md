# Reglas del proyecto

- Responde siempre en español de México.
- Stack: Astro con TypeScript. No agregues frameworks si no hacen falta.
- Backend (decidido el 19 de noviembre de 2026): API propia en NestJS 12 dentro de `api/`, con Prisma 7 y Postgres en Neon. Se desplegará en Railway; la página sigue en Vercel. Se eligió para aprender la estructura de empresa y conectar después una app móvil.
  - Proyecto ESM: imports relativos terminan en `.js` y las pruebas usan Vitest (`vi.fn()`).
  - Una sola rama de Neon. La base `neondb_test` es solo para pruebas e2e. La app usa el rol `cafe_app` (solo DML); el dueño solo migra.
  - Dinero en centavos (`Int`). Zona horaria `America/Mexico_City`.
  - Pago en caja al recoger. Estados: recibido → preparando → listo → entregado, sin cancelado.
  - En `api/` instala dependencias con `npx npm@11 install` (npm 10.9 falla con un bug de peers).
  - Railway: proyecto `cafe-la-esquina-api`, servicio `api`, dominio `https://cafe-api.multilabs.dev` (CNAME en Cloudflare sin proxy). La configuración vive en `api/.railway/railway.ts` (variables no administradas por código); despliegue con `railway up --service api` desde `api/`. `TRUST_PROXY=1`: Railway agrega un solo salto.
  - Página de esta rama: `https://pedidos.multilabs.dev` (único origen en `CORS_ORIGINS`). Llama a la API directo, sin rewrite: `API_URL` se usa en el build para el menú y se inyecta en `<html data-api>` para `src/lib/cliente.ts` (`credentials: "include"`). La cookie `__Host-sesion` funciona porque página y API son el mismo sitio (`multilabs.dev`); la protección contra otros subdominios es la lista de orígenes.
- Antes de escribir código, propón un plan y espera mi aprobación.
- Nada de diseño genérico de IA: sin degradados morados, sin emojis como iconos, sin tres tarjetas iguales en fila y sin frases de relleno como "Bienvenido a una experiencia única".
- Elige paleta y tipografía con personalidad, acordes al negocio.
- Iconos con Lucide. Sin fotos de stock: si hace falta imagen, ilustraciones simples en SVG.
- Textos reales y concretos, nunca lorem ipsum.
- No escribas comentarios en el código.
