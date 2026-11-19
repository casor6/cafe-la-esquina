import type { PrismaClient } from '../src/generated/prisma/client.js';

interface OpcionInicial {
  nombre: string;
  precioExtraCentavos: number;
  porDefecto?: boolean;
}

interface ProductoInicial {
  nombre: string;
  detalle: string;
  precioCentavos: number;
  grupo?: 'Leche' | 'Proteína';
}

const GRUPOS: Record<'Leche' | 'Proteína', { obligatorio: boolean; opciones: OpcionInicial[] }> = {
  Leche: {
    obligatorio: false,
    opciones: [
      { nombre: 'Entera', precioExtraCentavos: 0, porDefecto: true },
      { nombre: 'Avena', precioExtraCentavos: 1000 },
      { nombre: 'Almendra', precioExtraCentavos: 1000 },
    ],
  },
  Proteína: {
    obligatorio: true,
    opciones: [
      { nombre: 'Huevo', precioExtraCentavos: 0 },
      { nombre: 'Pollo', precioExtraCentavos: 0 },
    ],
  },
};

const CATEGORIAS: { nombre: string; productos: ProductoInicial[] }[] = [
  {
    nombre: 'Café',
    productos: [
      { nombre: 'Americano', detalle: 'Pluma Hidalgo, Oaxaca', precioCentavos: 4800 },
      { nombre: 'Espresso', detalle: 'Doble, mezcla de la casa', precioCentavos: 4000 },
      { nombre: 'Cortado', detalle: 'Mitad espresso, mitad leche', precioCentavos: 5000, grupo: 'Leche' },
      { nombre: 'Capuchino', detalle: 'Coatepec, Veracruz', precioCentavos: 5800, grupo: 'Leche' },
      { nombre: 'Café de olla', detalle: 'Canela y piloncillo', precioCentavos: 4800 },
      { nombre: 'Cold brew', detalle: 'Reposado 18 horas', precioCentavos: 6200 },
    ],
  },
  {
    nombre: 'Para acompañar',
    productos: [
      { nombre: 'Concha de nata', detalle: 'De la panadería de al lado', precioCentavos: 3500 },
      { nombre: 'Pan de elote', detalle: 'Rebanada gruesa, tibia', precioCentavos: 4200 },
      { nombre: 'Molletes', detalle: 'Frijol, queso y pico de gallo', precioCentavos: 8500 },
      { nombre: 'Chilaquiles verdes', detalle: 'Con huevo o pollo', precioCentavos: 11000, grupo: 'Proteína' },
    ],
  },
];

export async function sembrarMenu(prisma: PrismaClient): Promise<void> {
  const grupoIds = new Map<string, number>();

  for (const [nombre, grupo] of Object.entries(GRUPOS)) {
    const registro = await prisma.grupoOpciones.upsert({
      where: { nombre },
      update: { obligatorio: grupo.obligatorio },
      create: { nombre, obligatorio: grupo.obligatorio },
    });
    grupoIds.set(nombre, registro.id);

    for (const [orden, opcion] of grupo.opciones.entries()) {
      const datos = {
        precioExtraCentavos: opcion.precioExtraCentavos,
        porDefecto: opcion.porDefecto ?? false,
        orden,
        activo: true,
      };
      await prisma.opcion.upsert({
        where: { grupoId_nombre: { grupoId: registro.id, nombre: opcion.nombre } },
        update: datos,
        create: { grupoId: registro.id, nombre: opcion.nombre, ...datos },
      });
    }
  }

  for (const [ordenCategoria, categoria] of CATEGORIAS.entries()) {
    const registro = await prisma.categoria.upsert({
      where: { nombre: categoria.nombre },
      update: { orden: ordenCategoria },
      create: { nombre: categoria.nombre, orden: ordenCategoria },
    });

    for (const [orden, producto] of categoria.productos.entries()) {
      const datos = {
        categoriaId: registro.id,
        detalle: producto.detalle,
        precioCentavos: producto.precioCentavos,
        grupoOpcionesId: producto.grupo ? grupoIds.get(producto.grupo)! : null,
        orden,
        activo: true,
      };
      await prisma.producto.upsert({
        where: { nombre: producto.nombre },
        update: datos,
        create: { nombre: producto.nombre, ...datos },
      });
    }
  }
}
