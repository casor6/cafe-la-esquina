import { Global, Injectable, Module } from '@nestjs/common';

@Injectable()
export class Reloj {
  ahora(): Date {
    return new Date();
  }
}

@Global()
@Module({
  providers: [Reloj],
  exports: [Reloj],
})
export class RelojModule {}
