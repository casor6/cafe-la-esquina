import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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

const seleccionOpciones = {
  where: { activo: true },
  orderBy: { orden: 'asc' as const },
  select: { id: true, nombre: true, precioExtraCentavos: true, porDefecto: true },
};

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(): Promise<CategoriaMenu[]> {
    const categorias = await this.prisma.categoria.findMany({
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        nombre: true,
        productos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
          select: {
            id: true,
            nombre: true,
            detalle: true,
            precioCentavos: true,
            grupoOpciones: {
              select: { nombre: true, obligatorio: true, opciones: seleccionOpciones },
            },
          },
        },
      },
    });

    return categorias
      .filter((c) => c.productos.length > 0)
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        productos: c.productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          detalle: p.detalle,
          precioCentavos: p.precioCentavos,
          opciones: p.grupoOpciones
            ? {
                grupo: p.grupoOpciones.nombre,
                obligatorio: p.grupoOpciones.obligatorio,
                lista: p.grupoOpciones.opciones,
              }
            : null,
        })),
      }));
  }
}
