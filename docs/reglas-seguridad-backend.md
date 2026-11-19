# Reglas globales

## Seguridad de backend

Aplica a todo backend que construyas, en cualquier lenguaje, framework o base de datos. No es para después: entra en el mismo cambio que crea el servidor.

### Acceso
- Cerrado por default: toda ruta pide autenticación, salvo las públicas que yo nombre.
- Rutas de administrador protegidas en el servidor con rol verificado. Ocultarlas en la interfaz no cuenta.
- La identidad sale solo del token o la sesión validada en el servidor, nunca de un id que mande el cliente.
- Cada usuario solo lee y cambia lo suyo.
- Tokens y sesiones con expiración. Login con límite de intentos y sin revelar si la cuenta existe.

### Contraseñas y secretos
- Contraseñas con hash Argon2id (o bcrypt si no hay otra opción). Nunca en texto plano ni cifrado reversible.
- Claves de API, contraseñas de base y secretos solo en variables de entorno. Nunca en el código ni en el repositorio.
- `.env` en `.gitignore` y un `.env.example` sin valores reales.
- Si falta un secreto obligatorio, la app no arranca.

### Datos y base
- Valida en el servidor todo lo que entra: tipo, tamaño y formato. Rechaza campos que no esperas.
- Nunca confíes en precios, totales ni permisos que mande el navegador.
- Solo consultas parametrizadas u ORM. Nunca armes SQL o filtros pegando texto del usuario.
- Base con usuario de mínimos privilegios, conexión cifrada y sin exponerla a internet si no hace falta.
- Responde con los campos necesarios, nunca el registro crudo. Datos personales: los mínimos.

### Navegador
- HTTPS forzado en todo ambiente publicado.
- Cabeceras de seguridad (CSP, HSTS, nosniff, sin iframes ajenos).
- CORS solo para mis dominios, nunca `*` con credenciales.
- Cookies de sesión `HttpOnly`, `Secure` y `SameSite`, con protección CSRF.
- Contra XSS: escapa todo lo que muestres del usuario y nunca lo metas como HTML.

### Abuso y vigilancia
- Límite de peticiones por IP, más estricto en login y en acciones que crean datos. Detrás de un proxy, toma la IP real.
- Límite de tamaño en peticiones y archivos.
- Registra la actividad rara: logins fallidos, picos de peticiones, accesos denegados. Sin contraseñas, tokens ni datos personales en los logs.
- Errores al cliente con mensaje genérico, sin detalles internos.
- Dependencias sin vulnerabilidades altas conocidas.

### Al terminar
- Revisa el backend contra esta lista y dime qué cumple, qué falta y por qué.

## Antes de decir que terminaste

- Pasar el build y las pruebas no basta: abre cada pantalla en un navegador real (Playwright o el que tengas) y toma capturas.
- Revisa cada estado: sin sesión, con sesión, vacío, con datos, con error y en celular.
- Lo que debe estar oculto no se ve. Si usas el atributo `hidden`, que ningún `display` de tu CSS le gane.
- Lee los textos de las capturas: puntuación doble, espacios que faltan, palabras cortadas.
- Mira las capturas tú mismo y corrige antes de entregarme. Dime qué revisaste.
