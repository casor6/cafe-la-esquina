import { consultar } from "./supabase";

export interface Opcion {
  id: number;
  nombre: string;
  precio: number;
  disponible: boolean;
}

export interface GrupoOpciones {
  id: number;
  nombre: string;
  obligatorio: boolean;
  opciones: Opcion[];
}

export interface Producto {
  id: number;
  nombre: string;
  detalle: string;
  precio: number;
  disponible: boolean;
  grupos: GrupoOpciones[];
}

export interface Categoria {
  id: number;
  nombre: string;
  productos: Producto[];
}

export interface Horario {
  dia: number;
  abre: string;
  cierra: string;
}

interface FilaOpcion extends Opcion {
  orden: number;
}

interface FilaGrupo {
  grupos_opciones: Omit<GrupoOpciones, "opciones"> & { opciones: FilaOpcion[] };
}

interface FilaProducto extends Omit<Producto, "grupos"> {
  orden: number;
  producto_grupos: FilaGrupo[];
}

interface FilaCategoria {
  id: number;
  nombre: string;
  productos: FilaProducto[];
}

const porOrden = (a: { orden: number; id: number }, b: { orden: number; id: number }) =>
  a.orden - b.orden || a.id - b.id;

const seleccion =
  "id,nombre,productos(id,nombre,detalle,precio,disponible,orden,producto_grupos(grupos_opciones(id,nombre,obligatorio,opciones(id,nombre,precio,disponible,orden))))";

export async function obtenerCatalogo(): Promise<Categoria[]> {
  const filas = await consultar<FilaCategoria[]>(`categorias?select=${seleccion}&order=orden,id`);
  return filas.map((categoria) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    productos: [...categoria.productos].sort(porOrden).map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      detalle: producto.detalle,
      precio: Number(producto.precio),
      disponible: producto.disponible,
      grupos: producto.producto_grupos
        .map(({ grupos_opciones: grupo }) => ({
          id: grupo.id,
          nombre: grupo.nombre,
          obligatorio: grupo.obligatorio,
          opciones: [...grupo.opciones].sort(porOrden).map((opcion) => ({
            id: opcion.id,
            nombre: opcion.nombre,
            precio: Number(opcion.precio),
            disponible: opcion.disponible,
          })),
        }))
        .sort((a, b) => a.id - b.id),
    })),
  }));
}

export async function obtenerHorarios(): Promise<Horario[]> {
  const filas = await consultar<Horario[]>("horarios?select=dia,abre,cierra&order=dia");
  return filas.map((fila) => ({ dia: fila.dia, abre: fila.abre.slice(0, 5), cierra: fila.cierra.slice(0, 5) }));
}

export function opcionesDisponibles(grupo: GrupoOpciones): Opcion[] {
  return grupo.opciones.filter((opcion) => opcion.disponible);
}

export function sePuedePedir(producto: Producto): boolean {
  return (
    producto.disponible &&
    producto.grupos.every((grupo) => !grupo.obligatorio || opcionesDisponibles(grupo).length > 0)
  );
}
