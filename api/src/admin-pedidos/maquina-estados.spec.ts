import { siguienteEstado } from './maquina-estados.js';

describe('siguienteEstado', () => {
  it('avanza en orden recibido → preparando → listo → entregado', () => {
    expect(siguienteEstado('RECIBIDO')).toBe('PREPARANDO');
    expect(siguienteEstado('PREPARANDO')).toBe('LISTO');
    expect(siguienteEstado('LISTO')).toBe('ENTREGADO');
  });

  it('no hay estado después de entregado', () => {
    expect(siguienteEstado('ENTREGADO')).toBeNull();
  });
});
