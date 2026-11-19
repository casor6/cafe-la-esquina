import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import type { SolicitudConAdmin } from '../auth/token.js';
import type { EstadoPedido } from '../generated/prisma/enums.js';
import { AvanzarEstadoDto, ListarPedidosDto } from './admin-pedidos.dto.js';
import { AdminPedidosService, PedidoAdmin } from './admin-pedidos.service.js';

@Controller('admin/pedidos')
export class AdminPedidosController {
  constructor(private readonly servicio: AdminPedidosService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  listar(@Query() consulta: ListarPedidosDto): Promise<{ fecha: string; pedidos: PedidoAdmin[] }> {
    return this.servicio.listar(consulta.fecha);
  }

  @Patch(':id/estado')
  avanzar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AvanzarEstadoDto,
    @Req() req: SolicitudConAdmin,
  ): Promise<{ id: string; estado: EstadoPedido }> {
    return this.servicio.avanzar(id, dto.estadoActual, req.admin!.id);
  }
}
