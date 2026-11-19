export interface OpcionMenu {
  id: number;
  nombre: string;
  precioExtraCentavos: number;
  porDefecto: boolean;
}

export interface ProductoMenu {
  id: number;
  nombre: string;
  detalle: string;
  precioCentavos: number;
  opciones: { grupo: string; obligatorio: boolean; lista: OpcionMenu[] } | null;
}

export interface CategoriaMenu {
  id: number;
  nombre: string;
  productos: ProductoMenu[];
}

export type EstadoPedido = "RECIBIDO" | "PREPARANDO" | "LISTO" | "ENTREGADO";

export interface ItemResumen {
  nombre: string;
  opcion: string | null;
  cantidad: number;
  subtotalCentavos: number;
}

export interface PedidoCreado {
  id: string;
  folio: number;
  estado: EstadoPedido;
  horaRecogida: string;
  totalCentavos: number;
  items: ItemResumen[];
}

export interface PedidoAdmin extends PedidoCreado {
  nombreCliente: string;
  telefono: string;
  creadoEn: string;
}

export const RUTA_API = "/api/v1";

export function pesos(centavos: number): string {
  const valor = centavos / 100;
  return Number.isInteger(valor) ? `$${valor}` : `$${valor.toFixed(2)}`;
}

export function urlApi(): string {
  const url = import.meta.env.API_URL as string | undefined;
  if (url) return url.replace(/\/$/, "");
  if (import.meta.env.PROD) {
    throw new Error("Falta la variable API_URL para construir el sitio.");
  }
  return "http://localhost:3000";
}

export async function obtenerMenuEnBuild(): Promise<CategoriaMenu[]> {
  const respuesta = await fetch(`${urlApi()}${RUTA_API}/menu`);
  if (!respuesta.ok) {
    throw new Error(`La API respondió ${respuesta.status} al pedir el menú.`);
  }
  const datos = (await respuesta.json()) as { categorias: CategoriaMenu[] };
  return datos.categorias;
}
