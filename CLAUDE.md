# Reglas del proyecto

- Responde siempre en español de México.
- Stack: Astro con TypeScript. No agregues frameworks si no hacen falta.
- Antes de escribir código, propón un plan y espera mi aprobación.
- Nada de diseño genérico de IA: sin degradados morados, sin emojis como iconos, sin tres tarjetas iguales en fila y sin frases de relleno como "Bienvenido a una experiencia única".
- Elige paleta y tipografía con personalidad, acordes al negocio.
- Iconos con Lucide. Sin fotos de stock: si hace falta imagen, ilustraciones simples en SVG.
- Textos reales y concretos, nunca lorem ipsum.
- No escribas comentarios en el código.

# Backend de pedidos (decidido el 18 de noviembre de 2026)

- Todo el backend es Supabase (plan gratis): base de datos, autenticación y tiempo real. Se descartaron Turso/Astro DB y Firebase.
- La página sigue 100 % estática en Vercel. Sin funciones en Vercel, sin adaptador de servidor y sin llave secreta de Supabase en el proyecto.
- El navegador habla directo con Supabase usando solo la llave pública (`sb_publishable_...`). La URL y la llave pública viven en `src/lib/supabase.ts`; no son secretos.
- La seguridad vive en Postgres:
  - RLS activo en todas las tablas.
  - El público solo puede leer el catálogo (categorías, productos, opciones, horarios) y ejecutar `crear_pedido` y `consultar_pedido`. No puede leer ni escribir tablas de pedidos.
  - `crear_pedido` valida productos, opciones, teléfono y hora, y calcula el total dentro de la base. Nunca se confía en precios que mande el navegador.
  - Solo los usuarios registrados en `administradores` pueden ver pedidos y cambiar su estado.
- Pedidos solo para recoger, el mismo día. El pago es en caja al recoger; no hay pagos en línea.
- Datos del cliente: nombre, teléfono (10 dígitos) y hora para recoger.
- Horas para recoger: cada 15 minutos, con al menos 15 minutos de anticipación y la última 30 minutos antes de cerrar.
- Estados del pedido: recibido → preparando → listo → entregado (el panel puede regresar un paso para corregir errores).
- Los extras (leche vegetal, proteína de los chilaquiles) son grupos de opciones ligados a productos: una opción por grupo, y algunos grupos son obligatorios.
- El menú y los horarios para pedir viven en Supabase y el dueño los edita en el editor de tablas. El horario que muestra la portada sigue en `src/data/negocio.ts`: si cambia el horario, hay que cambiarlo en los dos lugares.
- Cambios de esquema: siempre como migración en `supabase/migrations/`, aplicada con `npx supabase db push`. Nunca editar una migración ya aplicada.
- El token de la CLI y la contraseña de la base van en las variables de entorno `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`. Nunca se escriben en archivos.
- Zona horaria del negocio: America/Mexico_City.
- Lo mantiene una sola persona: prioriza pocas dependencias y piezas simples.
