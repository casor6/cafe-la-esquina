import { Module } from '@nestjs/common';
import { AdminPedidosController } from './admin-pedidos.controller.js';
import { AdminPedidosService } from './admin-pedidos.service.js';

@Module({
  controllers: [AdminPedidosController],
  providers: [AdminPedidosService],
})
export class AdminPedidosModule {}
