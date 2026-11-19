import { Injectable } from '@nestjs/common';
import { ErrorDeNegocio } from '../common/error-de-negocio.js';
import { Reloj } from '../common/reloj.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { calcularPedido, ProductoCatalogo } from './calculo.js';
import { CrearPedidoDto } from './crear-pedido.dto.js';
import { esHorarioValido, horariosDisponibles, ZONA_HORARIA } from './horario.js';

export interface PedidoCreado {
  id: string;
  folio: number;
  estado: string;
  horaRecogida: string;
  totalCentavos: number;
  items: { nombre: string; opcion: string | null; cantidad: number; subtotalCentavos: number }[];
}

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reloj: Reloj,
  ) {}

  horarios(): { zonaHoraria: string; horarios: string[] } {
    return {
      zonaHoraria: ZONA_HORARIA,
      horarios: horariosDisponibles(this.reloj.ahora()).map((h) => h.toISOString()),
    };
  }

  async crear(dto: CrearPedidoDto): Promise<PedidoCreado> {
    const horaRecogida = new Date(dto.horaRecogida);
    if (!esHorarioValido(horaRecogida, this.reloj.ahora())) {
      throw new ErrorDeNegocio('Esa hora ya no está disponible. Elige otra.');
    }

    const ids = [...new Set(dto.items.map((i) => i.productoId))];
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: ids }, activo: true },
      select: {
        id: true,
        nombre: true,
        precioCentavos: true,
        grupoOpciones: {
          select: {
            nombre: true,
            obligatorio: true,
            opciones: {
              where: { activo: true },
              select: { id: true, nombre: true, precioExtraCentavos: true, porDefecto: true },
            },
          },
        },
      },
    });

    const catalogo = new Map<number, ProductoCatalogo>(
      productos.map((p) => [
        p.id,
        { id: p.id, nombre: p.nombre, precioCentavos: p.precioCentavos, grupo: p.grupoOpciones },
      ]),
    );
    const { lineas, totalCentavos } = calcularPedido(dto.items, catalogo);

    const pedido = await this.prisma.pedido.create({
      data: {
        nombreCliente: dto.nombre,
        telefono: dto.telefono,
        horaRecogida,
        totalCentavos,
        items: { create: lineas },
      },
      select: {
        id: true,
        folio: true,
        estado: true,
        horaRecogida: true,
        totalCentavos: true,
        items: {
          orderBy: { id: 'asc' },
          select: { nombreProducto: true, nombreOpcion: true, cantidad: true, subtotalCentavos: true },
        },
      },
    });

    return {
      id: pedido.id,
      folio: pedido.folio,
      estado: pedido.estado,
      horaRecogida: pedido.horaRecogida.toISOString(),
      totalCentavos: pedido.totalCentavos,
      items: pedido.items.map((i) => ({
        nombre: i.nombreProducto,
        opcion: i.nombreOpcion,
        cantidad: i.cantidad,
        subtotalCentavos: i.subtotalCentavos,
      })),
    };
  }
}
