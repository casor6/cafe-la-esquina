import { ErrorDeNegocio } from '../common/error-de-negocio.js';

export const MAX_PIEZAS_POR_PEDIDO = 30;

export interface OpcionCatalogo {
  id: number;
  nombre: string;
  precioExtraCentavos: number;
  porDefecto: boolean;
}

export interface ProductoCatalogo {
  id: number;
  nombre: string;
  precioCentavos: number;
  grupo: { nombre: string; obligatorio: boolean; opciones: OpcionCatalogo[] } | null;
}

export interface ItemSolicitado {
  productoId: number;
  cantidad: number;
  opcionId?: number;
}

export interface LineaCalculada {
  productoId: number;
  cantidad: number;
  nombreProducto: string;
  precioUnitarioCentavos: number;
  nombreOpcion: string | null;
  precioOpcionCentavos: number;
  subtotalCentavos: number;
}

export interface PedidoCalculado {
  lineas: LineaCalculada[];
  totalCentavos: number;
}

function elegirOpcion(producto: ProductoCatalogo, opcionId: number | undefined): OpcionCatalogo | null {
  const grupo = producto.grupo;
  if (!grupo) {
    if (opcionId !== undefined) {
      throw new ErrorDeNegocio(`${producto.nombre} no lleva opciones.`);
    }
    return null;
  }

  if (opcionId === undefined) {
    if (grupo.obligatorio) {
      throw new ErrorDeNegocio(`Elige ${grupo.nombre.toLowerCase()} para ${producto.nombre}.`);
    }
    return grupo.opciones.find((o) => o.porDefecto) ?? null;
  }

  const opcion = grupo.opciones.find((o) => o.id === opcionId);
  if (!opcion) {
    throw new ErrorDeNegocio(`Esa opción no está disponible para ${producto.nombre}.`);
  }
  return opcion;
}

export function calcularPedido(
  items: ItemSolicitado[],
  catalogo: Map<number, ProductoCatalogo>,
): PedidoCalculado {
  const piezas = items.reduce((suma, item) => suma + item.cantidad, 0);
  if (piezas > MAX_PIEZAS_POR_PEDIDO) {
    throw new ErrorDeNegocio(`El máximo es de ${MAX_PIEZAS_POR_PEDIDO} piezas por pedido.`);
  }

  const lineas = items.map((item): LineaCalculada => {
    const producto = catalogo.get(item.productoId);
    if (!producto) {
      throw new ErrorDeNegocio('Uno de los productos ya no está disponible.');
    }
    const opcion = elegirOpcion(producto, item.opcionId);
    const precioOpcionCentavos = opcion?.precioExtraCentavos ?? 0;
    return {
      productoId: producto.id,
      cantidad: item.cantidad,
      nombreProducto: producto.nombre,
      precioUnitarioCentavos: producto.precioCentavos,
      nombreOpcion: opcion?.nombre ?? null,
      precioOpcionCentavos,
      subtotalCentavos: (producto.precioCentavos + precioOpcionCentavos) * item.cantidad,
    };
  });

  return {
    lineas,
    totalCentavos: lineas.reduce((suma, l) => suma + l.subtotalCentavos, 0),
  };
}
