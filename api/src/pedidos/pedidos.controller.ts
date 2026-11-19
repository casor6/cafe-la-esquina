import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Publica } from '../common/publica.decorator.js';
import { CrearPedidoDto } from './crear-pedido.dto.js';
import { PedidoCreado, PedidosService } from './pedidos.service.js';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Publica()
  @Get('horarios')
  @Header('Cache-Control', 'no-store')
  horarios(): { zonaHoraria: string; horarios: string[] } {
    return this.pedidos.horarios();
  }

  @Publica()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  crear(@Body() dto: CrearPedidoDto): Promise<PedidoCreado> {
    return this.pedidos.crear(dto);
  }
}
