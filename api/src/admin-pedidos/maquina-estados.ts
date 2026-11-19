import { EstadoPedido } from '../generated/prisma/enums.js';

const SIGUIENTE: Record<EstadoPedido, EstadoPedido | null> = {
  RECIBIDO: EstadoPedido.PREPARANDO,
  PREPARANDO: EstadoPedido.LISTO,
  LISTO: EstadoPedido.ENTREGADO,
  ENTREGADO: null,
};

export function siguienteEstado(actual: EstadoPedido): EstadoPedido | null {
  return SIGUIENTE[actual];
}
