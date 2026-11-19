import { Controller, Get, Header } from '@nestjs/common';
import { Publica } from '../common/publica.decorator.js';
import { CategoriaMenu, MenuService } from './menu.service.js';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Publica()
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  async obtener(): Promise<{ categorias: CategoriaMenu[] }> {
    return { categorias: await this.menu.obtener() };
  }
}
