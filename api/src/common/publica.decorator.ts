import { SetMetadata } from '@nestjs/common';

export const RUTA_PUBLICA = 'rutaPublica';

export const Publica = () => SetMetadata(RUTA_PUBLICA, true);
