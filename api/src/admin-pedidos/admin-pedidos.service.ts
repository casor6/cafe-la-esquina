import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorDeNegocio } from '../common/error-de-negocio.js';
import { Reloj } from '../common/reloj.js';
import { EstadoPedido } from '../generated/prisma/enums.js';
import { fechaLocal, rangoDelDia } from '../pedidos/horario.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { siguienteEstado } from './maquina-estados.js';

export interface PedidoAdmin {
  id: string;
  folio: number;
  nombreCliente: string;
  telefono: string;
  horaRecogida: string;
  estado: EstadoPedido;
  totalCentavos: number;
  creadoEn: string;
  items: { nombre: string; opcion: string | null; cantidad: number; subtotalCentavos: number }[];
}

@Injectable()
export class AdminPedidosService {
  private readonly logger = new Logger('AdminPedidos');

  constructor(
    private readonly prisma: PrismaService,
    private readonly reloj: Reloj,
  ) {}

  async listar(fecha?: string): Promise<{ fecha: string; pedidos: PedidoAdmin[] }> {
    const dia = fecha ?? fechaLocal(this.reloj.ahora());
    const { inicio, fin } = rangoDelDia(dia);

    const pedidos = await this.prisma.pedido.findMany({
      where: { horaRecogida: { gte: inicio, lt: fin } },
      orderBy: [{ horaRecogida: 'asc' }, { folio: 'asc' }],
      take: 500,
      select: {
        id: true,
        folio: true,
        nombreCliente: true,
        telefono: true,
        horaRecogida: true,
        estado: true,
        totalCentavos: true,
        creadoEn: true,
        items: {
          orderBy: { id: 'asc' },
          select: { nombreProducto: true, nombreOpcion: true, cantidad: true, subtotalCentavos: true },
        },
      },
    });

    return {
      fecha: dia,
      pedidos: pedidos.map((p) => ({
        id: p.id,
        folio: p.folio,
        nombreCliente: p.nombreCliente,
        telefono: p.telefono,
        horaRecogida: p.horaRecogida.toISOString(),
        estado: p.estado,
        totalCentavos: p.totalCentavos,
        creadoEn: p.creadoEn.toISOString(),
        items: p.items.map((i) => ({
          nombre: i.nombreProducto,
          opcion: i.nombreOpcion,
          cantidad: i.cantidad,
          subtotalCentavos: i.subtotalCentavos,
        })),
      })),
    };
  }

  async avanzar(id: string, estadoActual: EstadoPedido, adminId: number): Promise<{ id: string; estado: EstadoPedido }> {
    const siguiente = siguienteEstado(estadoActual);
    if (!siguiente) {
      throw new ErrorDeNegocio('Este pedido ya fue entregado.', HttpStatus.CONFLICT);
    }

    const { count } = await this.prisma.pedido.updateMany({
      where: { id, estado: estadoActual },
      data: { estado: siguiente },
    });

    if (count === 0) {
      const existe = await this.prisma.pedido.findUnique({ where: { id }, select: { id: true } });
      if (!existe) throw new NotFoundException();
      throw new ErrorDeNegocio('El pedido cambió mientras tanto. Recarga la lista.', HttpStatus.CONFLICT);
    }

    this.logger.log(`Pedido ${id} pasó de ${estadoActual} a ${siguiente} admin=${adminId}`);
    return { id, estado: siguiente };
  }
}
